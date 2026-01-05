import { db } from "../firebase";
import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, deleteDoc, onSnapshot } from "firebase/firestore";

const COLLECTION_NAME = "notifications";

export const notificationService = {

    addNotification: async (targetUser, title, message, type = "info", link = null) => {
        try {
            await addDoc(collection(db, COLLECTION_NAME), {
                targetUser,
                title,
                message,
                type,
                read: false,
                link,
                createdAt: new Date().toISOString()
            });
            console.log(`Notification sent to ${targetUser}`);
        } catch (error) {
            console.error("Error adding notification:", error);
        }
    },


    notifyRole: async (role, title, message, type = "info", link = null) => {
        try {
            console.log(`[NotificationService] notifyRole called for: ${role}`);


            const snapshot = await getDocs(collection(db, "users"));
            console.log(`[NotificationService] Total users in DB: ${snapshot.size}`);

            const targetRoleLower = role.toLowerCase().trim();
            const matchingUsers = [];

            snapshot.forEach(doc => {
                const userData = doc.data();
                const userRole = (userData.role || "").toLowerCase().trim();


                if (userRole === targetRoleLower || userRole.includes(targetRoleLower)) {
                    matchingUsers.push(userData);
                }
            });

            console.log(`[NotificationService] Found ${matchingUsers.length} users matching role "${role}"`);


            const targets = new Set();
            matchingUsers.forEach(userData => {
                const target = userData.username || userData.email;
                if (target) targets.add(target);
            });
            console.log(`[NotificationService] Unique targets: ${Array.from(targets).join(", ")}`);

            const promises = Array.from(targets).map(target => {
                console.log(`[NotificationService] Sending notification to: ${target}`);
                return notificationService.addNotification(target, title, message, type, link);
            });

            await Promise.all(promises);
            console.log(`Notifications sent to role ${role}`);
        } catch (error) {
            console.error(`Error notifying role ${role}:`, error);
        }
    },


    subscribeToUserNotifications: (identities, callback) => {
        const targets = Array.isArray(identities) ? identities : [identities];
        const validTargets = targets.filter(t => t);

        if (validTargets.length === 0) return () => { };

        try {
            console.log(`[NotificationService] Subscribing to targets: ${validTargets.join(', ')}`);
            const q = query(
                collection(db, COLLECTION_NAME),
                where("targetUser", "in", validTargets)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                callback(notifs);
            }, (error) => {
                console.error("Notification subscription error:", error);
            });

            return unsubscribe;
        } catch (error) {
            console.error("Error setting up subscription:", error);
            return () => { };
        }
    },


    getUserNotifications: async (username) => {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where("targetUser", "==", username)
            );
            const snapshot = await getDocs(q);
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));


            return notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            console.error("Error fetching notifications:", error);
            return [];
        }
    },


    markAsRead: async (id) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, { read: true });
        } catch (error) {
            console.error("Error updating notification:", error);
        }
    },


    deleteNotification: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    },

    deleteAllNotificationsForUser: async (username) => {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where("targetUser", "==", username)
            );
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, COLLECTION_NAME, d.id)));
            await Promise.all(deletePromises);
            console.log(`Deleted all notifications for ${username}`);
        } catch (error) {
            console.error("Error deleting all notifications:", error);
            throw error;
        }
    }
};
