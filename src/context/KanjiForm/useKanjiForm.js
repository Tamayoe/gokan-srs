import { useContext } from "react";
import { KanjiFormContext } from "./KanjiFormContext";
export const useKanjiForm = () => {
    const ctx = useContext(KanjiFormContext);
    if (!ctx)
        throw new Error('useKanjiForm must be used inside KanjiFormProvider');
    return ctx;
};
