import type {VocabProgress} from "../models/vocabulary.model";
import {VocabCardLoader} from "./VocabCardLoader";

export function VocabList({ progress }: { progress: VocabProgress[] }) {
    return (
        <div className="grid grid-cols-1 gap-3">
            {progress.map(p => (
                <VocabCardLoader
                    key={p.vocabId}
                    progress={p}
                />
            ))}
        </div>
    );
}