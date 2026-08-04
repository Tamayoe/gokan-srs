import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText } from 'lucide-react';
import { useQuiz } from '../../context/useQuiz';
import { DailyActivityCard } from './DailyActivityCard';

/**
 * The activity hub - the app's landing page after setup. Activities (the main
 * actions a user can take) are presented as cards here; supporting pages
 * (Settings, Stats, Kanji) live in the global header toolbar instead, since
 * they aren't activities themselves. See issue #16.
 */
export const MainScreen: React.FC = () => {
    const { state, nextReviewAt, nextSessionPreview } = useQuiz();
    const navigate = useNavigate();

    return (
        <div className="w-full max-w-3xl mx-auto py-8">
            <h1 className="text-2xl font-serif text-primary mb-1">Study</h1>
            <p className="text-sm text-secondary mb-8">Choose an activity to begin.</p>

            {state.progress && <DailyActivityCard progress={state.progress} />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <QuizActivityCard
                    preview={nextSessionPreview}
                    nextReviewAt={nextReviewAt}
                    onClick={() => navigate('/quiz')}
                />
            </div>
        </div>
    );
};

const ActivityCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: React.ReactNode;
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

/** Minutes-until-next-review, rounded up, matching WaitingScreen's phrasing. */
function formatNextReview(nextReviewAt: Date): string {
    const minutes = Math.max(1, Math.ceil((nextReviewAt.getTime() - Date.now()) / 60000));
    return `Next review in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
}

const QuizActivityCard: React.FC<{
    preview: { review: number; new: number; retries: number };
    nextReviewAt: Date | null;
    onClick: () => void;
}> = ({ preview, nextReviewAt, onClick }) => {
    const { review, new: newCount, retries } = preview;
    const caughtUp = review === 0 && newCount === 0 && retries === 0;

    let description: React.ReactNode;
    if (caughtUp) {
        description = nextReviewAt
            ? formatNextReview(nextReviewAt)
            : "You're all caught up.";
    } else {
        const parts: React.ReactNode[] = [`${review} review`, `${newCount} new`];
        if (retries > 0) {
            parts.push(<span key="retries" className="text-error">{retries} retries</span>);
        }
        description = parts.reduce<React.ReactNode[]>((acc, part, i) => {
            if (i > 0) acc.push(<span key={`sep-${i}`} className="text-tertiary"> · </span>);
            acc.push(part);
            return acc;
        }, []);
    }

    return (
        <ActivityCard
            icon={<BookOpenText size={22} className="text-accent" />}
            title="Vocabulary quiz session"
            description={description}
            onClick={onClick}
        />
    );
};
