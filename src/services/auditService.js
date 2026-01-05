import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

/**
 * Audit Log Service
 * Tracks all administrative actions for accountability and compliance
 */
export const auditService = {
  /**
   * Log an administrative action
   * @param {string} action - Action type (e.g., "USER_CREATED", "USER_DELETED")
   * @param {object} performedBy - Admin who performed the action { uid, username, email }
   * @param {object} targetUser - User affected by the action { uid, username, email }
   * @param {object} details - Additional action-specific details
   */
  logAction: async (action, performedBy, targetUser, details = {}) => {
    try {
      await addDoc(collection(db, "auditLogs"), {
        action,
        performedBy: {
          uid: performedBy.uid || null,
          username: performedBy.username || "Unknown",
          email: performedBy.email || null,
        },
        targetUser: {
          uid: targetUser.uid || null,
          username: targetUser.username || "Unknown",
          email: targetUser.email || null,
        },
        details,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error logging audit action:", error);
      // Don't throw - audit logging should not break main functionality
    }
  },

  /**
   * Get audit logs with optional filters
   * @param {object} filters - Optional filters { action, startDate, endDate, performedByUid, targetUserUid }
   * @param {number} maxResults - Maximum number of results (default 100)
   */
  getAuditLogs: async (filters = {}, maxResults = 100) => {
    try {
      let q = query(
        collection(db, "auditLogs"),
        orderBy("timestamp", "desc"),
        limit(maxResults)
      );

      const snapshot = await getDocs(q);
      let logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || null,
      }));

      // Client-side filtering (Firestore has limitations on compound queries)
      if (filters.action) {
        logs = logs.filter((log) => log.action === filters.action);
      }
      if (filters.performedByUid) {
        logs = logs.filter(
          (log) => log.performedBy?.uid === filters.performedByUid
        );
      }
      if (filters.targetUserUid) {
        logs = logs.filter(
          (log) => log.targetUser?.uid === filters.targetUserUid
        );
      }
      if (filters.startDate) {
        logs = logs.filter(
          (log) => log.timestamp && log.timestamp >= filters.startDate
        );
      }
      if (filters.endDate) {
        logs = logs.filter(
          (log) => log.timestamp && log.timestamp <= filters.endDate
        );
      }

      return logs;
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time audit log updates
   * @param {function} callback - Function called with updated logs array
   * @param {number} maxResults - Maximum number of results
   * @returns {function} - Unsubscribe function
   */
  subscribeToAuditLogs: (callback, maxResults = 100) => {
    const q = query(
      collection(db, "auditLogs"),
      orderBy("timestamp", "desc"),
      limit(maxResults)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || null,
        }));
        callback(logs);
      },
      (error) => {
        console.error("Error subscribing to audit logs:", error);
      }
    );
  },

  // Action type constants for consistency
  ACTIONS: {
    USER_CREATED: "USER_CREATED",
    USER_UPDATED: "USER_UPDATED",
    USER_DEACTIVATED: "USER_DEACTIVATED",
    USER_ACTIVATED: "USER_ACTIVATED",
    USER_DELETED: "USER_DELETED",
    FORCE_LOGOUT: "FORCE_LOGOUT",
    PASSWORD_RESET_SENT: "PASSWORD_RESET_SENT",
  },
};
