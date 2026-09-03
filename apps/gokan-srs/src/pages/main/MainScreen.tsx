import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, BookOpenText, Puzzle } from 'lucide-react';
import { useQuiz } from '../../context/useQuiz';
import { DailyActivityCard } from './DailyActivityCard';

/**
 * The activity hub - the app's landing page after setup. Activities (the main
 * actions a user can take) are presented as cards here; supporting pages
 * (Settings, Stats, Kanji) live in the global header toolbar instead, since
 * they aren't activities themselves. See issue #16.
 */
export const MainScreen: React.FC = () => {
    const { state, nextReviewAt, nextSessionPreview, grammarNextReviewAt, nextGrammarSessionPreview } = useQuiz();
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
                <GrammarActivityCard
                    preview={nextGrammarSessionPreview}
                    nextReviewAt={grammarNextReviewAt}
                    onClick={() => navigate('/grammar')}
                />
            </div>

            <DictionaryCard />
        </div>
    );
};

/**
 * The dictionary is a reference tool, not an activity: nothing is scheduled, nothing is
 * reviewed, and opening it does not start a session. So it sits below the activity grid as a
 * full-width card rather than becoming a third sibling of the quiz and grammar cards, which
 * would imply it belongs to the same rhythm they do.
 *
 * A plain <a>, not navigate(): gokan-dictionary is a separate statically generated app served
 * from the /dictionary prefix of this same origin, so this is a real page load rather than a
 * route this SPA knows about. It 404s under `bun run dev`, where only the SRS app is served.
 */
const DictionaryCard: React.FC = () => (
    <a
        href="/dictionary/"
        className="mt-4 flex items-start gap-3 rounded-lg border border-divider bg-surface p-4 transition-colors hover:bg-surface-hover"
    >
        <BookMarked size={18} className="mt-0.5 shrink-0 text-secondary" />
        <div>
            <p className="font-serif text-primary">Dictionary</p>
            <p className="mt-0.5 text-sm text-secondary">
                Look up any word, kanji, or grammar point: readings, meanings, JLPT levels, and
                example sentences. No session, no schedule.
            </p>
        </div>
    </a>
);

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

interface SessionPreview {
    review: number;
    new: number;
    retries: number;
}

/** Shared by every activity card that previews an upcoming SRS session (vocab, grammar): "{review} review · {new} new", appending retries in the error color, falling back to a caught-up message with an ETA when known. */
function renderSessionPreviewDescription(preview: SessionPreview, nextReviewAt: Date | null): React.ReactNode {
    const { review, new: newCount, retries } = preview;
    const caughtUp = review === 0 && newCount === 0 && retries === 0;

    if (caughtUp) {
        return nextReviewAt ? formatNextReview(nextReviewAt) : "You're all caught up.";
    }

    const parts: React.ReactNode[] = [`${review} review`, `${newCount} new`];
    if (retries > 0) {
        parts.push(<span key="retries" className="text-error">{retries} retries</span>);
    }
    return parts.reduce<React.ReactNode[]>((acc, part, i) => {
        if (i > 0) acc.push(<span key={`sep-${i}`} className="text-tertiary"> · </span>);
        acc.push(part);
        return acc;
    }, []);
}

const QuizActivityCard: React.FC<{
    preview: SessionPreview;
    nextReviewAt: Date | null;
    onClick: () => void;
}> = ({ preview, nextReviewAt, onClick }) => (
    <ActivityCard
        icon={<BookOpenText size={22} className="text-accent" />}
        title="Vocabulary quiz session"
        description={renderSessionPreviewDescription(preview, nextReviewAt)}
        onClick={onClick}
    />
);

const GrammarActivityCard: React.FC<{
    preview: SessionPreview;
    nextReviewAt: Date | null;
    onClick: () => void;
}> = ({ preview, nextReviewAt, onClick }) => (
    <ActivityCard
        icon={<Puzzle size={22} className="text-accent" />}
        title="Grammar quiz session"
        description={renderSessionPreviewDescription(preview, nextReviewAt)}
        onClick={onClick}
    />
);
