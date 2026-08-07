import { useEffect } from 'react';

interface UseSessionLifecycleOptions {
    /**
     * True when a study session should be running: the activity's route is on
     * screen AND there is review/learn work. Computed by the caller (a primitive,
     * so it's a stable effect dependency).
     */
    active: boolean;
    /** True when a session is already committed in state. */
    hasSession: boolean;
    /**
     * Called with `now` on the false->true edge of `active` (a session begins).
     * The caller snapshots the committed workload and dispatches its own
     * activity-specific SESSION_START. Kept as a callback so the reducer stays
     * free of Date.now() and this hook stays activity-agnostic.
     */
    onStart: (now: Date) => void;
    /** Called on the true->false edge of `active` (the session ends). */
    onEnd: () => void;
}

/**
 * Shared session-lifecycle effect for both quiz activities (see the twin effects
 * this replaced in useQuizOrchestration / useGrammarOrchestration). A session
 * begins the moment there is work to do AND the activity's page is on screen, and
 * ends when either stops holding (queue drains, or the user navigates away) -
 * leaving early ends it exactly like running out naturally. Resuming later starts
 * a brand new session rather than reopening the old one.
 *
 * Only `active`/`hasSession` drive the effect; onStart/onEnd are intentionally
 * excluded from the deps (they are fresh closures each render, and re-running on
 * every render would re-fire the transitions).
 */
export function useSessionLifecycle({ active, hasSession, onStart, onEnd }: UseSessionLifecycleOptions) {
    useEffect(() => {
        if (active && !hasSession) {
            onStart(new Date());
        } else if (!active && hasSession) {
            onEnd();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, hasSession]);
}
