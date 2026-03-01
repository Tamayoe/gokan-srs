import { describe, it, expect } from 'vitest';
import { SRSService } from '../packages/core/src/services/srs.service';
import { CONSTANTS } from '../packages/core/src/commons/constants';

describe('SRSService Intro Logic (Pure Functions)', () => {

    describe('createVocabProgress', () => {
        it('should create a valid new VocabProgress object', () => {
            const vocabId = 'test-vocab-1';
            const progress = SRSService.createVocabProgress(vocabId);

            expect(progress.vocabId).toBe(vocabId);
            expect(progress.stage).toBe('learning');
            expect(progress.introductionAt).toBeNull(); // Not yet introduced
            expect(progress.nextReviewAt).toBeNull();
            // Checking against initialDifficulty
            expect(progress.reading.difficulty).toBe(CONSTANTS.srs.formula.initialDifficulty);
        });
    });

    describe('applyVocabIntroChoice', () => {
        it('should set review time to NOW if choice is "learn"', () => {
            const vocabId = 'test-vocab-1';
            const progress = SRSService.createVocabProgress(vocabId);
            const updated = SRSService.applyVocabIntroChoice(progress, 'learn');

            expect(updated.stage).toBe('learning');
            expect(updated.introductionAt).toBeInstanceOf(Date);
            expect(updated.nextReviewAt).toBeInstanceOf(Date);
            // Should be roughly now
            const now = new Date();
            const diff = Math.abs(updated.nextReviewAt!.getTime() - now.getTime());
            expect(diff).toBeLessThan(2000); // 2s buffer
        });

        it('should graduated immediately if choice is "skip"', () => {
            const vocabId = 'test-vocab-1';
            const progress = SRSService.createVocabProgress(vocabId);
            const updated = SRSService.applyVocabIntroChoice(progress, 'skip');

            expect(updated.stage).toBe('graduated');
            expect(updated.introductionAt).toBeInstanceOf(Date);
            expect(updated.nextReviewAt).toBeNull();
            expect(updated.reading.memoryStrength).toBe(CONSTANTS.srs.formula.mastery.maxMemoryStrength);
        });
    });
});
