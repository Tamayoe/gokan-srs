import { describe, it, expect, beforeEach } from 'vitest';
import { GoogleDriveSync } from './google.service';

// Helper to create mock progress
const createMockProgress = (
    kanjiSet: string[],
    version: number,
    totalReviews: number = 0
): any => ({
    kanjiKnowledge: {
        method: 'kklc',
        step: 100,
        kanjiSet: new Set(kanjiSet)
    },
    learningQueue: [],
    stats: {
        totalReviews,
        totalLearned: 0,
        newLearnedToday: 0
    },
    dailyOverride: false,
    _sync: {
        lastModified: Date.now(),
        version
    }
});

describe('GoogleDriveSync', () => {
    let service: GoogleDriveSync;

    beforeEach(() => {
        service = new GoogleDriveSync('mock-token');
    });

    describe('deepMerge', () => {
        it('should respect local deletion (Last Version Wins) when local version is higher', () => {
            // Scenario:
            // Remote (v1): Has kanji "A" and "B"
            // Local (v2): User deleted "B", so only "A" remains
            // Expected: "B" should NOT reappear. Result should be "A".

            const remote = createMockProgress(['A', 'B'], 1);
            const local = createMockProgress(['A'], 2);

            // Access private method via casting
            const merged = (service as any).deepMerge(local, remote);

            expect(merged._sync.version).toBe(3); // v2 + 1
            expect(merged.kanjiKnowledge.kanjiSet.has('A')).toBe(true);

            // This is the key expectation: "B" should be gone because local (v2) > remote (v1)
            expect(merged.kanjiKnowledge.kanjiSet.has('B')).toBe(false);
            expect(merged.kanjiKnowledge.kanjiSet.size).toBe(1);
        });

        it('should respect remote deletion (Last Version Wins) when remote version is higher', () => {
            // Scenario:
            // Local (v1): Has kanji "A" and "B"
            // Remote (v2): User deleted "B" on another device
            // Expected: "B" should be removed locally. Result should be "A".

            const local = createMockProgress(['A', 'B'], 1);
            const remote = createMockProgress(['A'], 2);

            const merged = (service as any).deepMerge(local, remote);

            expect(merged._sync.version).toBe(3);
            expect(merged.kanjiKnowledge.kanjiSet.has('A')).toBe(true);
            expect(merged.kanjiKnowledge.kanjiSet.has('B')).toBe(false);
            expect(merged.kanjiKnowledge.kanjiSet.size).toBe(1);
        });

        it('should prioritized LOCAL if versions are equal (Local Authority strategy)', () => {
            // Updated Strategy (2026-02-17):
            // Previously we used Union for safety. 
            // However, this caused "Zombie Kanji" bugs where deleted items resurfaced.
            // We now assume 'Local' is the authoritative source of truth for the active session.
            // Trade-off: If user added 'A' on Dev1 and 'B' on Dev2 simultaneously (same version), 'B' is lost.
            // Benefit: Deletions actually work.

            const local = createMockProgress(['A'], 1);
            const remote = createMockProgress(['B'], 1);

            const merged = (service as any).deepMerge(local, remote);

            expect(merged.kanjiKnowledge.kanjiSet.has('A')).toBe(true);
            expect(merged.kanjiKnowledge.kanjiSet.has('B')).toBe(false); // Local 'A' wins, Remote 'B' is ignored
            expect(merged.kanjiKnowledge.kanjiSet.size).toBe(1);
        });
    });
});
