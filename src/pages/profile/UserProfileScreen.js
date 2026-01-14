import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { KanjiKnowledgeEditor } from "../../components/KanjiKnowledgeEditor";
import { THEME } from "../../commons/theme";
import { useQuiz } from "../../context/useQuiz";
import { VocabList } from "../../components/VocabList";
export function UserProfileScreen({ onBack }) {
    const { state, actions } = useQuiz();
    return (_jsxs("div", { className: "w-full max-w-5xl flex flex-col gap-2", children: [_jsxs("header", { className: "mb-6 flex justify-between items-center", children: [_jsx("h1", { className: "text-xl", style: {
                            color: THEME.colors.primary,
                            fontFamily: THEME.fonts.serif,
                        }, children: "Your learning" }), _jsx("button", { onClick: onBack, children: "Back" })] }), _jsxs("section", { className: "mt-8", children: [_jsx("h2", { className: "text-lg mb-4", style: { color: THEME.colors.primary }, children: "Kanji" }), _jsx(KanjiKnowledgeEditor, { onKanjiKnowledgeChange: actions.updateKanjiKnowledge })] }), _jsxs("section", { className: "mt-16", children: [_jsx("h2", { className: "text-lg mb-4", style: { color: THEME.colors.primary }, children: "Vocabulary" }), _jsx(VocabList, { progress: state.progress.learningQueue })] })] }));
}
