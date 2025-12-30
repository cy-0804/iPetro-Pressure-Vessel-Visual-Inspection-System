import { db, storage } from "../firebase";
import {
    collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDocs
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";



// Helper: Upload Image
export const uploadEquipmentImage = async (file) => {
    if (!file) return null;
    try {
        const storageRef = ref(storage, `equipment_images/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
};

const COLLECTION_NAME = "equipments";

// Mimicking 'uploadHighscore' pattern from reference
export const addEquipment = async (data) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: new Date()
        });
        console.log("Document written with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e; // Re-throw so UI knows it failed
    }
};

export const updateEquipment = async (id, data) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, data);
        console.log("Document updated");
    } catch (e) {
        console.error("Error updating document: ", e);
        throw e;
    }
};

export const removeEquipment = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        console.log("Document deleted");
    } catch (e) {
        console.error("Error deleting document: ", e);
        throw e;
    }
};

export const subscribeToEquipment = (callback) => {
    return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
    }, (error) => {
        console.error("Listener error:", error);
    });
};

export const getEquipments = async () => {
    try {
        const q = query(collection(db, COLLECTION_NAME));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching equipments: ", e);
        return [];
    }
};
