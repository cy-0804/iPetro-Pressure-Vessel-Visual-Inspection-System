import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

const DOC_ID = "dropdowns";
const COLLECTION = "metadata";

// Initial Seed Data (Pressure Vessel Standards)
const DEFAULT_OPTIONS = {
    types: [
        'Pressure Vessel', 'Heat Exchanger', 'Storage Tank (API 650)', 'Storage Tank (API 620)',
        'Piping Circuit', 'Boiler', 'Heater', 'Reactor', 'Column/Tower', 'Separator', 'Sphere'
    ],
    functions: [
        'Storage', 'Separation', 'Heat Transfer', 'Reaction', 'Mixing', 'Filtering', 'Pressure Relief'
    ],
    geometries: [
        'Cylindrical (Horizontal)', 'Cylindrical (Vertical)', 'Spherical', 'Conical', 'Rectangular/Box'
    ],
    constructions: [
        'Welded', 'Riveted', 'Forged', 'Multi-layer', 'Brazed'
    ],
    services: [
        'General Hydrocarbon', 'Sour Service (H2S)', 'Corrosive', 'Steam', 'Water',
        'Air/Nitrogen', 'Lethal Service', 'Cryogenic'
    ],
    orientations: [
        'Horizontal', 'Vertical', 'Sloped'
    ],
    statuses: [
        'Active', 'In Service', 'Out of Service', 'Under Maintenance',
        'Construction/Fabrication', 'Scrapped/Decommissioned', 'Spare'
    ]
};

export const fetchDropdownOptions = async () => {
    try {
        const docRef = doc(db, COLLECTION, DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            // First time? Seed the DB
            await setDoc(docRef, DEFAULT_OPTIONS);
            return DEFAULT_OPTIONS;
        }
    } catch (e) {
        console.error("Error fetching options:", e);
        return DEFAULT_OPTIONS; // Fallback
    }
};

export const addDropdownOption = async (category, value) => {
    try {
        const docRef = doc(db, COLLECTION, DOC_ID);
        await updateDoc(docRef, {
            [category]: arrayUnion(value)
        });
        return true;
    } catch (e) {
        console.error(`Error adding to ${category}:`, e);
        throw e;
    }
};

export const removeDropdownOption = async (category, value) => {
    try {
        const docRef = doc(db, COLLECTION, DOC_ID);
        await updateDoc(docRef, {
            [category]: arrayRemove(value)
        });
        return true;
    } catch (e) {
        console.error(`Error removing from ${category}:`, e);
        throw e;
    }
};
