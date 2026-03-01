import type { VocabProgress } from "@gokan-srs/core/models/vocabulary.model";
import { VocabCardLoader } from "./VocabCardLoader";

export function VocabList({ progress, onVocabClick }: { progress: VocabProgress[]; onVocabClick?: (vocabId: string) => void }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {progress.map(p => (
                <VocabCardLoader
                    key={p.vocabId}
                    progress={p}
                    onClick={onVocabClick}
                />
            ))}
        </div>
    );
}
