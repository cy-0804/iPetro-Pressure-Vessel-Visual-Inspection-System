import { db } from "../firebase";
import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, deleteDoc } from "firebase/firestore";

const COLLECTION_NAME = "notifications";

export const notificationService = {
    // Add a new notification
    addNotification: async (targetUser, title, message, type = "info") => {
        try {
            await addDoc(collection(db, COLLECTION_NAME), {
                targetUser, // Username or User ID
                title,
                message,
                type, // info, success, alert
                read: false,
                createdAt: new Date().toISOString()
            });
            console.log(`Notification sent to ${targetUser}`);
        } catch (error) {
            console.error("Error adding notification:", error);
        }
    },

    // Fetch notifications for a specific user
    getUserNotifications: async (username) => {
        try {
            // Case-insensitive matching might be needed depending on how usernames are stored
            // For now, assuming exact match
            const q = query(
                collection(db, COLLECTION_NAME),
                where("targetUser", "==", username)
                // orderBy("createdAt", "desc") // requires index, can filter client-side for now
            );
            const snapshot = await getDocs(q);
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort client-side to avoid index requirement for now
            return notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            console.error("Error fetching notifications:", error);
            return [];
        }
    },

    // Mark as read
    markAsRead: async (id) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, { read: true });
        } catch (error) {
            console.error("Error updating notification:", error);
        }
    },

    // Delete notification
    deleteNotification: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    }
};
