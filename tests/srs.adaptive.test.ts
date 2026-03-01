import { describe, it, expect } from 'vitest';
import { SRSService } from '../packages/core/src/services/srs.service';
import { CONSTANTS } from '../packages/core/src/commons/constants';

describe('SRSService - Adaptive Logic', () => {

    describe('updateAdaptiveStats', () => {
        const { levelStep, minLevel, maxLevel, historySize } = CONSTANTS.srs.adaptive;

        it('should initialize correctly', () => {
            const stats = { level: 1.0, history: [] };
            const result = SRSService.updateAdaptiveStats(stats, 'correct');

            expect(result.level).toBe(1.0);
            expect(result.history).toEqual([true]);
        });

        it('should maintain history size', () => {
            const history = Array(historySize).fill(true);
            const stats = { level: 1.0, history };

            const result = SRSService.updateAdaptiveStats(stats, 'wrong');

            expect(result.history.length).toBe(historySize);
            expect(result.history[historySize - 1]).toBe(false); // Newest
            expect(result.history[0]).toBe(true); // Oldest (shifted)
        });

        it('should increase difficulty (level up) when win rate is high', () => {
            // Setup high win rate history (> 0.85)
            // 20 items, all true = 100%
            const history = Array(20).fill(true);
            const stats = { level: 1.0, history };

            const result = SRSService.updateAdaptiveStats(stats, 'correct');

            // 21/21 = 100% > 0.85
            // Should increase by step (0.05)
            expect(result.level).toBeCloseTo(1.0 + levelStep);
        });

        it('should decrease difficulty (level down) when win rate is low', () => {
            // Setup low win rate history (< 0.70)
            // 20 items, 10 true, 10 false = 50%
            const history = [...Array(10).fill(true), ...Array(10).fill(false)];
            const stats = { level: 1.0, history };

            const result = SRSService.updateAdaptiveStats(stats, 'wrong');

            // 10/21 < 50% < 0.70
            // Should decrease by step
            expect(result.level).toBeCloseTo(1.0 - levelStep);
        });

        it('should clamp level within bounds', () => {
            // Test MAX clamp
            const maxStats = { level: maxLevel, history: Array(20).fill(true) };
            const maxResult = SRSService.updateAdaptiveStats(maxStats, 'correct');
            expect(maxResult.level).toBe(maxLevel);

            // Test MIN clamp
            const minStats = { level: minLevel, history: Array(20).fill(false) };
            const minResult = SRSService.updateAdaptiveStats(minStats, 'wrong');
            expect(minResult.level).toBe(minLevel);
        });

        it('should not adjust level if history is insufficient (< 10 items)', () => {
            const history = [true, true]; // Only 2 items
            const stats = { level: 1.0, history };

            const result = SRSService.updateAdaptiveStats(stats, 'correct');

            // 3/3 = 100%, but not enough samples
            expect(result.level).toBe(1.0);
        });
    });

    describe('calculateRecentWinRate', () => {
        it('should calculate win rate from queue', () => {
            const queue: any[] = [
                {
                    reading: { history: [{ result: 'correct' }, { result: 'wrong' }] },
                    meaning: { history: [] }
                },
                {
                    reading: { history: [{ result: 'correct' }] },
                    meaning: { history: [] }
                }
            ];

            // Total: 3, Success: 2. Rate: 0.66
            const rate = SRSService.calculateRecentWinRate(queue);
            expect(rate).toBeCloseTo(0.666, 2);
        });
    });
});
