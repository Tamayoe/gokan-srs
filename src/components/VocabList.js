import { jsx as _jsx } from "react/jsx-runtime";
import { VocabCardLoader } from "./VocabCardLoader";
export function VocabList({ progress }) {
    return (_jsx("div", { className: "grid grid-cols-1 gap-3", children: progress.map(p => (_jsx(VocabCardLoader, { progress: p }, p.vocabId))) }));
}
