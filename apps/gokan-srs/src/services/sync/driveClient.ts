import { GoogleAuthError } from './types';

export interface DriveFile {
    id: string;
    name: string;
    modifiedTime: string;
}

/**
 * Thin wrapper around the Google Drive v3 REST API. No merge/business logic
 * lives here - just HTTP calls and auth-error translation, so mergeProgress.ts
 * and GoogleDriveSync can both be tested without a network.
 */
export class DriveClient {
    private readonly accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    private authHeader() {
        return { Authorization: `Bearer ${this.accessToken}` };
    }

    private async checkOk(response: Response, action: string): Promise<void> {
        if (response.ok) return;
        if (response.status === 401 || response.status === 403) {
            throw new GoogleAuthError('Authentication failed or token expired', response.status);
        }
        throw new Error(`Failed to ${action}: ${response.status}`);
    }

    async findFolder(name: string): Promise<string | null> {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            { headers: this.authHeader() }
        );
        await this.checkOk(response, 'list folders');
        const { files } = await response.json();
        return files?.length > 0 ? files[0].id : null;
    }

    async createFolder(name: string): Promise<string> {
        const response = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { ...this.authHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
        });
        await this.checkOk(response, 'create folder');
        const { id } = await response.json();
        return id;
    }

    /** Returns ALL non-trashed files matching the name (may be >1 on a duplicate-file split-brain). */
    async listFilesByName(folderId: string, name: string): Promise<DriveFile[]> {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(name)}' and '${folderId}' in parents and trashed=false&fields=files(id,name,modifiedTime)`,
            { headers: this.authHeader() }
        );
        await this.checkOk(response, 'list files');
        const { files } = await response.json();
        return files ?? [];
    }

    async getFileMetadata(fileId: string): Promise<{ modifiedTime: string }> {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`,
            { headers: this.authHeader() }
        );
        await this.checkOk(response, 'fetch file metadata');
        return response.json();
    }

    async downloadFileContent(fileId: string): Promise<any> {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers: this.authHeader() }
        );
        await this.checkOk(response, 'fetch file content');
        return response.json();
    }

    async uploadNewFile(folderId: string, name: string, content: unknown): Promise<string> {
        const metadata = { name, mimeType: 'application/json', parents: [folderId] };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: this.authHeader(),
            body: form,
        });
        await this.checkOk(response, 'upload new file');
        const result = await response.json();
        return result.id;
    }

    async updateFile(fileId: string, content: unknown): Promise<void> {
        const metadata = { name: undefined }; // no rename
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
            method: 'PATCH',
            headers: this.authHeader(),
            body: form,
        });
        await this.checkOk(response, 'update file');
    }

    async trashFile(fileId: string): Promise<void> {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'PATCH',
            headers: { ...this.authHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ trashed: true }),
        });
        await this.checkOk(response, 'trash duplicate file');
    }
}
