import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { CenteredCard } from "./CenteredCard";

interface ActivityStatusCardProps {
    title: string;
    /** Message body (may include markup, e.g. a bolded ETA). */
    children: ReactNode;
}

/**
 * Between-work status card for an activity's waiting / exhausted states: a
 * centered title + message + "Back to activities" link. Currently used by the
 * Grammar screen (whose waiting/exhausted copy is generic); vocab keeps its own
 * WaitingScreen/ExhaustedScreen since their copy is word-specific and
 * WaitingScreen carries a "Learn more" action this card has no place for.
 */
export function ActivityStatusCard({ title, children }: ActivityStatusCardProps) {
    return (
        <CenteredCard>
            <h2 className="text-xl mb-4 text-primary font-serif">{title}</h2>
            <p className="text-sm mb-6 text-secondary font-serif">{children}</p>
            <Link to="/" className="text-xs text-secondary hover:text-primary transition-colors">
                Back to activities
            </Link>
        </CenteredCard>
    );
}
