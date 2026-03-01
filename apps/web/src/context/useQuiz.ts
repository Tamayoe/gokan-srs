import {createContext, useContext} from "react";
import type {QuizContextValue} from "./QuizContext";

export const QuizContext = createContext<QuizContextValue | null>(null);

export const useQuiz = () => {
    const ctx = useContext(QuizContext);
    if (!ctx) throw new Error('useQuiz must be used within QuizProvider');
    return ctx;
};
