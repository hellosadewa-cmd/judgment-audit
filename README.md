# Judgment Audit

Audit an AI design judge before you trust it.

AI models are starting to decide which design wins: in contests, agencies, and platforms. In Contra Labs' Design Crit study (June 2026), off-the-shelf AI judges agreed with a five-designer panel's majority on only 51–54% of choices between two designs, against 50% for a coin flip and 74% for designers. The same study found that a model can be consistent without being right.

Judgment Audit measures both. It audits Muse Spark as a judge of advertising designs, and the same test set can audit any vision model.

> Built for the Meta Global AI Developer Hackathon 2026 (Indie track, "Build for Your World").

## How it works

For 12 designs, each with its brief, the judge receives 96 standalone requests in a seeded random order:

| Test | What changes | What stays the same |
| --- | --- | --- |
| Repeats | Nothing: the design is judged 3 times | Everything |
| Settings | The design is shown in 3 presentation settings (frame, laptop screen, billboard) | The design's own pixels, checked by code |
| Order | Two designs are compared in both orders | The two designs |

The judge scores each design from 1 to 5 on visual quality, fidelity to the brief, originality, and readiness for real use (the rubric of Contra Labs' Human Creativity Benchmark), and picks the stronger design in each pair. A panel of designers makes the same pair choices on `/panel`.

The report shows:

- **Self-consistency:** how often a score changes when the same design is judged again.
- **Setting shift:** how far the score moves when only the surroundings change, with a bootstrap 95% interval.
- **Order effect:** how often the chosen design flips when the order is swapped.
- **Agreement with designers:** how often the judge matches the panel's majority, next to how often each designer matches the rest of the panel.

## The judge does not audit itself

Every number is computed in code, and every sentence and recommendation in the report comes from fixed templates written before the audit ran. The audited model never writes or interprets its own results. Variants are checked pixel by pixel in code, not by a model.

## Meta models

| Model | Role |
| --- | --- |
| SAM 3.1 (`sam-3.1`) | Finds where the design sits in each presentation scene |
| Muse Image (`muse-image-1.0`) | Generates the presentation settings around the design |
| Muse Spark (`muse-spark-1.3`) | The judge being audited |

## Status

The audit pipeline, statistics, report, and designer panel are built and tested. Muse Spark, SAM 3.1, and Muse Image have not been run on the audit set yet, so `/judge` says so instead of showing numbers. Results will be published exactly as measured.

## Data and attribution

The 12 designs and briefs come from Contra Labs' [creative-ad-design-dataset](https://huggingface.co/datasets/contralabs/creative-ad-design-dataset), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). They were drawn with a fixed seed (`scripts/import-contra.ts`) and resized to 1080 px (`scripts/prepare-designs.ts`). Reference figures come from Contra Labs' [Design Crit](https://contralabs.com/research/design-crit) and [Human Creativity Benchmark](https://contralabs.com/research/human-creativity-benchmark). The publisher sells evaluation services, and the studies are not peer reviewed.

The designer panel collects no names. Each panelist is a random id kept in their own browser.

## Built during the hackathon

Everything in this repository was written during the hackathon, starting 28 October 2026. The commit history is the record of what was built and when. An earlier version audited human review teams; that flow (`/new`) is still in the code.

## Development

```bash
npm install
npm test
npm run dev
```

## License

Code: MIT. Designs in `public/designs`: CC BY 4.0, Contra Labs.
