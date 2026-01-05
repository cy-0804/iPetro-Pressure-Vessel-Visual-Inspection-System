// VERSION 2.0 - Fixed to query by inspectorName instead of inspectorId
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();
const auth = getAuth();

/**
 * Callable function to delete a user completely from Firebase
 * Deletes: Auth account + Firestore user document
 * Preserves: Inspections (marks inspector as deleted)
 *
 * Only admins can call this function
 */
exports.deleteUserComplete = onCall(async (request) => {
  // 1. Security check - ensure caller is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Must be logged in to delete users."
    );
  }

  // 2. Check if caller is an admin
  const callerUid = request.auth.uid;
  const callerDoc = await db.collection("users").doc(callerUid).get();

  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete users.");
  }

  // 3. Get UID of user to delete
  const { uid } = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "User UID is required.");
  }

  // 4. Prevent admin from deleting themselves
  if (uid === callerUid) {
    throw new HttpsError(
      "failed-precondition",
      "Cannot delete your own account."
    );
  }

  // 5. Get target user info before deletion (for logging and updating inspections)
  const targetUserDoc = await db.collection("users").doc(uid).get();
  const targetUserData = targetUserDoc.exists ? targetUserDoc.data() : null;

  if (!targetUserData) {
    throw new HttpsError("not-found", "User not found in database.");
  }

  // Get the inspector name to search for in inspections
  // Try multiple possible name formats
  const possibleNames = [];
  if (targetUserData.firstName && targetUserData.lastName) {
    possibleNames.push(
      `${targetUserData.firstName} ${targetUserData.lastName}`
    );
  }
  if (targetUserData.fullName) {
    possibleNames.push(targetUserData.fullName);
  }
  if (targetUserData.username) {
    possibleNames.push(targetUserData.username);
  }
  if (targetUserData.email) {
    possibleNames.push(targetUserData.email);
  }

  console.log("Searching for inspections with names:", possibleNames);

  try {
    const deletedItems = [];
    const updatedItems = [];

    // 6. Delete from Firebase Auth
    try {
      await auth.deleteUser(uid);
      deletedItems.push("auth");
    } catch (authError) {
      console.warn(
        "Auth user not found or already deleted:",
        authError.message
      );
    }

    // 7. Delete from Firestore (users collection)
    if (targetUserDoc.exists) {
      await db.collection("users").doc(uid).delete();
      deletedItems.push("firestore-user");
    }

    // 8. PRESERVE INSPECTIONS - Mark inspector as deleted instead of deleting
    // Query by inspectorName (the field actually used in inspections)
    let totalInspectionsUpdated = 0;

    for (const inspectorName of possibleNames) {
      if (!inspectorName) continue;

      // Skip if name already contains "(Deleted)"
      if (inspectorName.includes("(Deleted)")) continue;

      const inspectionsQuery = await db
        .collection("inspections")
        .where("inspectorName", "==", inspectorName)
        .get();

      console.log(
        `Found ${inspectionsQuery.size} inspections for name: ${inspectorName}`
      );

      if (inspectionsQuery.size > 0) {
        const updatePromises = inspectionsQuery.docs.map((doc) => {
          return doc.ref.update({
            inspectorDeleted: true,
            inspectorDeletedAt: new Date().toISOString(),
            inspectorName: `${inspectorName} (Deleted)`,
            originalInspectorName: inspectorName,
            originalInspectorId: uid,
            originalInspectorEmail: targetUserData.email || null,
          });
        });

        await Promise.all(updatePromises);
        totalInspectionsUpdated += inspectionsQuery.size;
      }
    }

    if (totalInspectionsUpdated > 0) {
      updatedItems.push(`inspections:${totalInspectionsUpdated}`);
    }

    // 9. Delete notifications targeting this user
    const notifQueries = [];

    if (targetUserData.email) {
      notifQueries.push(
        db
          .collection("notifications")
          .where("targetUser", "==", targetUserData.email)
          .get()
      );
    }
    if (targetUserData.username) {
      notifQueries.push(
        db
          .collection("notifications")
          .where("targetUser", "==", targetUserData.username)
          .get()
      );
    }

    const notifSnapshots = await Promise.all(notifQueries);
    const notifDeletePromises = notifSnapshots.flatMap((snap) =>
      snap.docs.map((doc) => doc.ref.delete())
    );
    await Promise.all(notifDeletePromises);

    const totalNotifs = notifSnapshots.reduce(
      (sum, snap) => sum + snap.size,
      0
    );
    if (totalNotifs > 0) {
      deletedItems.push(`notifications:${totalNotifs}`);
    }

    // 10. Log the deletion action to audit
    await db.collection("auditLogs").add({
      action: "USER_DELETED_COMPLETE",
      performedBy: {
        uid: callerUid,
        username: callerDoc.data().username || "Admin",
        email: callerDoc.data().email || null,
      },
      targetUser: {
        uid: uid,
        username: targetUserData.username || "Unknown",
        email: targetUserData.email || null,
      },
      details: {
        deletedItems: deletedItems,
        updatedItems: updatedItems,
        inspectionsPreserved: totalInspectionsUpdated,
        searchedNames: possibleNames,
        deletedAt: new Date().toISOString(),
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message:
        "User deleted. Inspections preserved with inspector marked as deleted.",
      deletedItems: deletedItems,
      updatedItems: updatedItems,
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new HttpsError("internal", error.message);
  }
});
