# Niche Test

If AI can remake your work in a minute, so can your client.

Creative studios, agencies, and freelancers are losing work to AI, and low-complexity design work goes first. The way through is to find a niche AI does not yet dominate, use AI as the tool to build it, and keep people in charge of what ships.

Niche Test tells a studio whether its niche is still its own.

> Built by Korsa Agency for the Meta Global AI Developer Hackathon 2026 (Indie track, "Build for Your World"). Korsa is the first studio to run the test on itself.

## How it works

1. **AI tries to replicate the work.** Muse Spark reads a piece the studio sells and writes the brief a client would give. Muse Image makes the design from that brief alone, without seeing the original.
2. **People curate.** Curators decide, piece by piece: would the AI version be acceptable to the same client?
3. **A verdict.** The share of works AI replicated to a client's standard is combined with four signs of a niche AI cannot easily take:
   - buyers have a recurring budget;
   - the work must stay consistent across many assets;
   - there is a standard, regulation, or fixed format;
   - it depends on local language or context.

| | 2 or more signs | Fewer than 2 |
| --- | --- | --- |
| **AI replicates 50% or more** | Move up: sell the system, not the files | Leave this niche as a main product |
| **AI replicates less than 50%** | Keep it and build on it, with AI as the tool | The edge is real; test the demand first |

The thresholds were fixed before any curator voted. The four signs come from the report "Bertahan di Pasar Aset Digital" (2026), section Q15.

## Pages

- `/niche/korsa`: Korsa's own test on 10 published landing page shots, with every original next to the AI version, the brief, the curators' votes, and the verdict.
- `/curate/korsa`: where curators judge the Korsa test. No names are collected.
- `/try`: run the test live on one of your own works. Your image is not stored. Live runs are capped per day because each one spends model credits.

## Meta models

| Model | Role |
| --- | --- |
| Muse Spark (`muse-spark-1.3`) | Reads the work and writes the client's brief |
| Muse Image (`muse-image-1.0`) | Makes the design from the brief alone |

Every number and verdict is computed in code from fixed rules. The models make the replica; people decide whether it is good enough.

## Built during the hackathon

Everything in this repository was written during the hackathon, starting 28 October 2026, and the commit history is the record. The project began as Judgment Audit, an audit of how consistently reviewers judge work. On 2 November it became Niche Test, after the founder concluded that auditing judges did not help a studio decide what to build. The earlier pages (`/judge`, `/panel`, `/new`) remain in the code but are no longer part of the product.

## Data and attribution

- Korsa's works are Korsa Agency's own published Dribbble shots.
- The designs used by the earlier judge audit come from Contra Labs' [creative-ad-design-dataset](https://huggingface.co/datasets/contralabs/creative-ad-design-dataset) (CC BY 4.0).

## Development

```bash
npm install
npm test
npm run dev
```

`MODEL_API_KEY` must be set for `/try` and for `scripts/replicate.ts`.

## License

Code: MIT. Korsa's works: © Korsa Agency, shown here for the test. Designs in `public/designs`: CC BY 4.0, Contra Labs.
