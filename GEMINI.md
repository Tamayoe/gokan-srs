# GEMINI Project Context

## Design System

> [!IMPORTANT]
> **Adhere strictly to the design system.**
> Gokan SRS is a study instrument, not a game. The appearance must be calm, precise, and trustworthy.

Refer to [DESIGN_SYSTEM.md](file:///c:/Programmation/Gokan%20SRS/gokan-srs/DESIGN_SYSTEM.md) for full details.

### Key Principles
- **Tone**: Neutral, Direct, Encouraging (no cheerleading).
- **Visuals**: Minimize colors. Use Primary Accent (Indigo) for focus. Use Secondary Accent (Muted Vermilion) ONLY for errors/warnings. catch-all boxes should normally be subtle.
- **Animations**: Minimal (150-200ms), no bounce.

## Functional Workflows

### Learning Queue Logic
The SRS study session follows a strict priority system:

1.  **Reviews First**:
    -   While the queue contains items with `nextReviewAt <= now`, these are presented to the user.
    -   Order: Random selection from the pool of due items (to prevent interference effects).

2.  **New Vocabulary Introduction**:
    -   If (and only if) no reviews are due (`nextReviewAt` is future or empty), the system checks for **New Items**.
    -   **New Items** are defined as items in the queue with `nextReviewAt: null`. (Note: The queue itself is refilled from the main Index based on daily limits).
    -   **User Action**:
        -   **Learn**: Item activates with base memory strength. `nextReviewAt` set to `now` (becomes immediately reviewable).
        -   **Skip**: Item is marked as **Fully Mastered** (`maxMemoryStrength`). Stage set to `graduated`. It will not appear in reviews.
        -   **Mastery**: If `memoryStrength` ≥ `maxMemoryStrength` after a review, item graduates. `nextReviewAt` is cleared.

3.  **Completion**:
    -   Session ends when: No Due Reviews AND (Daily Limit Reached OR No More Learnable Content).

### Error Handling
-   **Data Integrity**: If a vocabulary file fails to load, the application must **suspend operation** (Critical Error). Silent skipping is not permitted as it masks fundamental data corruption.

## Agent Memory
> [!IMPORTANT]
> **Documentation is mandatory.**
> All functional changes and their evolution must be documented in `GEMINI.md`. This file serves as the long-term memory of the system logic. Always capture the *result* of investigations and the *reasoning* behind system behavior changes.

### Modification Log
-   **[2026-01-26]**: Documented SRS priority workflow and error handling policy.
-   **[2026-01-22]**: Acknowledged new Design System. Refactoring visual feedback to match "Sober & Serious" tone.
