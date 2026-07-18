import { useState } from 'react';
import type { Sense } from '../../models/vocabulary.model';

/** "primary, alt1, alt2" - shared by the intro card and reading quiz's correct-answer reveal. */
export function formatReadingList(reading: { primary: string; alternatives: string[] }): string {
    return [reading.primary, ...reading.alternatives].join(', ');
}

/** Deduped part-of-speech tags across all senses, optionally including misc/register tags. */
export function getUniquePosTags(senses: Sense[], includeMiscTags = false): string[] {
    return Array.from(new Set(
        senses.flatMap(sense => includeMiscTags
            ? [...sense.pos, ...(sense.misc?.rawTags ?? [])]
            : sense.pos)
    ));
}

/** Deduped related compounds across all senses. */
export function getUniqueRelatedCompounds(senses: Sense[]): string[] {
    return Array.from(new Set(senses.flatMap(sense => sense.related?.compounds ?? [])));
}

/** Shared "+N more definitions" expand/collapse behavior for quiz cards. */
export function useExpandableDefinitions(senses: Sense[], maxDefs: number) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasMoreDefs = senses.length > maxDefs;
    const displayedSenses = isExpanded ? senses : senses.slice(0, maxDefs);
    return { displayedSenses, hasMoreDefs, isExpanded, toggleExpanded: () => setIsExpanded(v => !v) };
}
