// js/db.js — IndexedDB layer using raw IDB API (no dependencies)
// Stores all local data: workouts, plans, goals, health metrics, exercises

const DB_NAME = 'fitcoach';
const DB_VERSION = 1;
let dbInstance = null;

const STORES = {
    profile: { keyPath: 'id' },
    goals: { keyPath: 'id' },
    trainingPlans: { keyPath: 'id' },
    plannedWorkouts: { keyPath: 'id', indexes: ['planId', 'date', 'status'] },
    completedWorkouts: { keyPath: 'id', indexes: ['date', 'type', 'plannedWorkoutId'] },
    exerciseSets: { keyPath: 'id', indexes: ['workoutId', 'exerciseId'] },
    exercises: { keyPath: 'id', indexes: ['category', 'muscleGroup'] },
    gear: { keyPath: 'id' },
    bodyMetrics: { keyPath: 'id', indexes: ['date'] },
    healthMetrics: { keyPath: 'id', indexes: ['date'] },
    fitnessScores: { keyPath: 'id', indexes: ['date'] },
    stravaActivities: { keyPath: 'id', indexes: ['date', 'type'] }
};

function openDB() {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            for (const [name, config] of Object.entries(STORES)) {
                if (!db.objectStoreNames.contains(name)) {
                    const store = db.createObjectStore(name, { keyPath: config.keyPath });
                    if (config.indexes) {
                        config.indexes.forEach(idx => store.createIndex(idx, idx, { unique: false }));
                    }
                }
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            reject(new Error('Failed to open database: ' + event.target.error));
        };
    });
}

// Generic CRUD operations
export async function dbPut(storeName, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(data);
        tx.oncomplete = () => resolve(data);
        tx.onerror = (e) => reject(e.target.error);
    });
}

export async function dbGet(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
    });
}

export async function dbGetAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
}

export async function dbGetByIndex(storeName, indexName, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const index = tx.objectStore(storeName).index(indexName);
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
}

export async function dbGetByRange(storeName, indexName, lower, upper) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const index = tx.objectStore(storeName).index(indexName);
        const range = IDBKeyRange.bound(lower, upper);
        const request = index.getAll(range);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
}

export async function dbDelete(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

export async function dbPutMany(storeName, items) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach(item => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

export async function dbClear(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

export async function dbCount(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// Export all data for backup
export async function exportAllData() {
    const data = {};
    for (const storeName of Object.keys(STORES)) {
        data[storeName] = await dbGetAll(storeName);
    }
    return data;
}

// Import data from backup
export async function importAllData(data) {
    for (const [storeName, items] of Object.entries(data)) {
        if (STORES[storeName] && Array.isArray(items)) {
            await dbPutMany(storeName, items);
        }
    }
}

// Generate unique ID
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Initialize DB on load
export { openDB };
