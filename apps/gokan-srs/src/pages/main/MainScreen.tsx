import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, CheckCircle2, X, XCircle } from 'lucide-react';
import { useQuiz } from '../../context/useQuiz';

/**
 * The activity hub - the app's landing page after setup. Activities (the main
 * actions a user can take) are presented as cards here; supporting pages
 * (Settings, Stats, Kanji) live in the global header toolbar instead, since
 * they aren't activities themselves. See issue #16.
 */
export const MainScreen: React.FC = () => {
    const { state, actions } = useQuiz();
    const navigate = useNavigate();

    return (
        <div className="w-full max-w-3xl mx-auto py-8">
            <h1 className="text-2xl font-serif text-primary mb-1">Study</h1>
            <p className="text-sm text-secondary mb-8">Choose an activity to begin.</p>

            {state.lastSessionRecap && (
                <SessionRecapCard
                    recap={state.lastSessionRecap}
                    onDismiss={() => actions.dismissSessionRecap()}
                />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ActivityCard
                    icon={<BookOpenText size={22} className="text-accent" />}
                    title="Vocabulary quiz session"
                    description="Review due words and learn new vocabulary."
                    onClick={() => navigate('/quiz')}
                />
            </div>
        </div>
    );
};

const ActivityCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}> = ({ icon, title, description, onClick }) => (
    <button
        onClick={onClick}
        className="text-left border border-divider rounded p-6 bg-surface hover:border-accent transition-colors duration-200 flex flex-col gap-3 cursor-pointer"
    >
        {icon}
        <div>
            <h2 className="font-serif text-lg text-primary mb-1">{title}</h2>
            <p className="text-sm text-secondary">{description}</p>
        </div>
    </button>
);

const SessionRecapCard: React.FC<{
    recap: { reviewed: number; correct: number; incorrect: number };
    onDismiss: () => void;
}> = ({ recap, onDismiss }) => (
    <div className="mb-8 border border-divider rounded bg-surface p-4 flex items-start justify-between gap-4">
        <div>
            <h2 className="text-sm font-medium text-primary mb-2">Session complete</h2>
            <div className="flex flex-wrap gap-4 text-sm text-secondary">
                <span>{recap.reviewed} reviewed</span>
                <span className="flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-accent" /> {recap.correct} correct
                </span>
                {recap.incorrect > 0 && (
                    <span className="flex items-center gap-1 text-error">
                        <XCircle size={14} /> {recap.incorrect} incorrect
                    </span>
                )}
            </div>
        </div>
        <button
            onClick={onDismiss}
            title="Dismiss"
            className="text-secondary hover:text-primary transition-colors cursor-pointer shrink-0"
        >
            <X size={16} />
        </button>
    </div>
);
