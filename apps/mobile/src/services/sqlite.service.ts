import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

let db: SQLite.SQLiteDatabase | null = null;
// Single shared init promise so concurrent callers wait on the same operation.
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function vocabBundleUri(): string {
    if (Platform.OS === 'android') {
        return 'file:///android_asset/data/compiled/vocab-bundle.json';
    }
    return `${FileSystem.bundleDirectory}data/compiled/vocab-bundle.json`;
}

async function populateVocabFromBundle(dbInstance: SQLite.SQLiteDatabase): Promise<void> {
    const content = await FileSystem.readAsStringAsync(vocabBundleUri(), {
        encoding: FileSystem.EncodingType.UTF8,
    });
    const bundle = JSON.parse(content) as Record<string, unknown>;
    const entries = Object.entries(bundle);

    // Batch into groups of 200 rows to stay well under SQLite's 999-parameter limit
    // (2 params × 200 rows = 400 params per statement) and reduce bridge round-trips.
    const BATCH = 200;
    await dbInstance.withExclusiveTransactionAsync(async (txn) => {
        for (let i = 0; i < entries.length; i += BATCH) {
            const slice = entries.slice(i, i + BATCH);
            const placeholders = slice.map(() => '(?, ?)').join(', ');
            const params: string[] = slice.flatMap(([id, data]) => [id, JSON.stringify(data)]);
            await txn.runAsync(
                `INSERT OR IGNORE INTO vocab (id, data) VALUES ${placeholders}`,
                params,
            );
        }
    });
}

async function openAndInit(): Promise<SQLite.SQLiteDatabase> {
    const instance = await SQLite.openDatabaseAsync('gokan.db');

    await instance.execAsync(`
        CREATE TABLE IF NOT EXISTS vocab (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sentences (vocab_id TEXT PRIMARY KEY, data TEXT NOT NULL);
    `);

    const row = await instance.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM vocab');
    if (!row || row.c === 0) {
        // First launch — migrate from the bundled vocab-bundle.json.
        // This is a one-time cost (~2-5 s) on the user's first startup.
        await populateVocabFromBundle(instance);
    }

    return instance;
}

/** Returns the shared, fully-initialised database. Safe to call concurrently. */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;
    if (!initPromise) {
        initPromise = openAndInit().then((d) => {
            db = d;
            return d;
        });
    }
    return initPromise;
}

export async function queryVocab(id: string): Promise<unknown | null> {
    const dbInstance = await getDb();
    const row = await dbInstance.getFirstAsync<{ data: string }>(
        'SELECT data FROM vocab WHERE id = ?',
        id,
    );
    return row ? JSON.parse(row.data) : null;
}

/**
 * Returns cached sentences for a vocab ID, or null if not yet cached.
 * Callers should fetch from CDN and call `cacheSentences` on a cache miss.
 */
export async function querySentences(vocabId: string): Promise<unknown[] | null> {
    const dbInstance = await getDb();
    const row = await dbInstance.getFirstAsync<{ data: string }>(
        'SELECT data FROM sentences WHERE vocab_id = ?',
        vocabId,
    );
    return row ? (JSON.parse(row.data) as unknown[]) : null;
}

/** Persists sentences for offline use after fetching from the CDN. */
export async function cacheSentences(vocabId: string, sentences: unknown[]): Promise<void> {
    const dbInstance = await getDb();
    await dbInstance.runAsync(
        'INSERT OR REPLACE INTO sentences (vocab_id, data) VALUES (?, ?)',
        vocabId,
        JSON.stringify(sentences),
    );
}
