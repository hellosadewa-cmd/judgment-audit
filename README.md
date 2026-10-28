# Judgment Audit

A 15-minute audit that shows a creative team how consistently it judges the same work.

We audit AI for bias all the time. Nobody audits the humans who review work every day. In a well-known insurance audit, executives expected two underwriters to differ by about 10%; the typical difference was 55%. Creative reviews have the same hidden noise, and nobody sees it, because each piece is judged only once.

Judgment Audit makes that noise visible. It builds a test set from a team's own work: exact repeats, plus controlled variants where only an irrelevant detail (background or lighting) changes. Reviewers score everything independently. The app then reports how much the team disagrees, how often each person disagrees with themselves, and how much irrelevant details move the verdict.

> Built for the Meta Global AI Developer Hackathon 2026 (Indie track, "Build for Your World").

## Built during the hackathon

Everything in this repository was written during the hackathon, starting 28 October 2026. The commit history is the record of what was built and when.

## Meta models in the core loop

| Model | Role |
| --- | --- |
| SAM 3.1 (`sam-3.1`) | Segments the design so it can be protected during edits |
| Muse Image (`muse-image-1.0`) | Changes only an irrelevant detail, such as the background or lighting |
| Muse Spark (`muse-spark-1.3`) | Checks every variant to confirm the design itself is unchanged, and writes the team report from computed statistics |

All numbers in the report are computed deterministically in code. The language model explains them; it never produces them.

## Status

Work in progress. Setup instructions, methodology, pilot results, and limitations will be added before submission.

## License

MIT
