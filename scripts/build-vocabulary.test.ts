import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Vocabulary Data Integrity', () => {
    it('should have vocab files for all IDs in KKLC index', () => {
        const kklcIndex = JSON.parse(
            fs.readFileSync('./data/compiled/index/kklc.json', 'utf-8')
        );

        const missingFiles: string[] = [];

        for (const [step, vocabIds] of Object.entries(kklcIndex)) {
            for (const id of vocabIds as string[]) {
                const vocabPath = path.join('./data/compiled/vocab', `${id}.json`);
                if (!fs.existsSync(vocabPath)) {
                    missingFiles.push(`Step ${step}: ${id}`);
                }
            }
        }

        expect(missingFiles).toEqual([]);
    });

    it('should have vocab files for all IDs in frequency index', () => {
        const frequencyIndex = JSON.parse(
            fs.readFileSync('./data/compiled/index/frequency.json', 'utf-8')
        );

        const missingFiles: string[] = [];

        for (const entry of frequencyIndex) {
            const vocabPath = path.join('./data/compiled/vocab', `${entry.id}.json`);
            if (!fs.existsSync(vocabPath)) {
                missingFiles.push(entry.id);
            }
        }

        expect(missingFiles).toEqual([]);
    });

    it('should have valid JSON in all vocab files', () => {
        const vocabDir = './data/compiled/vocab';
        const files = fs.readdirSync(vocabDir);

        const invalidFiles: string[] = [];

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            try {
                const content = fs.readFileSync(path.join(vocabDir, file), 'utf-8');
                JSON.parse(content);
            } catch (error) {
                invalidFiles.push(file);
            }
        }

        expect(invalidFiles).toEqual([]);
    });
});
