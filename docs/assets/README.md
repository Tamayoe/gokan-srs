# README assets

Images referenced by the root [README.md](../../README.md). Until these files exist, the
README shows broken images on the repository landing page, so add them before pushing the
README changes.

Capture from a real account with a few weeks of progress. A fresh account shows empty charts
and a queue of introduction cards, which undersells the app.

| File | Page | What it should show |
|---|---|---|
| `hero.png` | `/quiz` | A reading review card mid-session, with the session progress bar and history ticker visible. This is the first impression, so pick a word with a clean written form. |
| `quiz-reading.png` | `/quiz` | A reading quiz card. Can be the same shot as the hero, cropped tighter. |
| `hub.png` | `/` | The activity hub with both cards showing real counts, the daily activity chart populated, and the dictionary card below. |
| `grammar-quiz.png` | `/grammar` | A cloze exercise with several blanks, ideally one hint revealed so the feature is visible. |
| `stats.png` | `/stats` | The knowledge curve and JLPT coverage bars with enough history to show a trend. |
| `session.gif` | `/quiz` | 10 to 20 seconds: answer a reading correctly, auto-advance, answer a meaning, get one wrong and see the retry. Keep it under about 5 MB or GitHub will be slow to load it. |

## Capture notes

Shoot at a 1440px-wide viewport in light mode for consistency with the design system. Use a
2x device pixel ratio so the images stay sharp on high-density displays; GitHub scales them
down to the widths set in the README.

For the GIF, record at 1280x800 or smaller. GitHub renders README images at roughly 820px
wide, so anything larger is wasted bytes.

Crop out the browser chrome, the URL bar, and any personal information such as a Google
account avatar in the sync indicator.

## Adding more

If you add an image here, reference it from the README with an explicit `width` so it renders
predictably, and add a row to the table above so the next person knows what it is meant to
show.
