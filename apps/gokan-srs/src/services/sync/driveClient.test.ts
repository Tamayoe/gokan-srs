import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriveClient } from './driveClient';
import { GoogleAuthError } from './types';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
    return {
        ok,
        status,
        json: async () => body,
    } as Response;
}

describe('DriveClient', () => {
    let client: DriveClient;

    beforeEach(() => {
        client = new DriveClient('mock-token');
    });

    it('translates 401 into a GoogleAuthError', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 401));
        await expect(client.findFolder('KanjiApp')).rejects.toThrow(GoogleAuthError);
    });

    it('translates 403 into a GoogleAuthError', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 403));
        await expect(client.listFilesByName('folder-1', 'progress.json')).rejects.toThrow(GoogleAuthError);
    });

    it('throws a plain Error (not GoogleAuthError) for other failure statuses', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 500));
        await expect(client.findFolder('KanjiApp')).rejects.toThrow(/500/);
        try {
            await client.findFolder('KanjiApp');
        } catch (e) {
            expect(e).not.toBeInstanceOf(GoogleAuthError);
        }
    });

    it('findFolder returns the first matching folder id', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ files: [{ id: 'folder-abc' }] }));
        expect(await client.findFolder('KanjiApp')).toBe('folder-abc');
    });

    it('findFolder returns null when no folder exists', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ files: [] }));
        expect(await client.findFolder('KanjiApp')).toBeNull();
    });

    it('listFilesByName returns all matching files (for duplicate detection)', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({
            files: [{ id: 'f1', name: 'progress.json', modifiedTime: '2026-01-01' }, { id: 'f2', name: 'progress.json', modifiedTime: '2026-01-02' }],
        }));
        const files = await client.listFilesByName('folder-1', 'progress.json');
        expect(files).toHaveLength(2);
    });

    it('uploadNewFile returns the new file id', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ id: 'new-file-id' }));
        expect(await client.uploadNewFile('folder-1', 'progress.json', { some: 'data' })).toBe('new-file-id');
    });
});
