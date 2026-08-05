# Chat Templates Illustrated

An interactive, browser-only curriculum about what changes between base language models and instruction-tuned chat models.

The project builds on [Statistical Nature of LLMs](https://hanclinto.github.io/StatisticalNatureOfLLMs/) by moving one layer outward from next-token probabilities. It will expose how applications serialize chat messages, how models learn to use reserved role and turn markers, how a host decides when generation is finished, and how conversation history becomes the next prompt.

Inference will run locally in the browser. The application will be a static React/TypeScript site deployed on GitHub Pages, with quantized models downloaded on demand and cached in browser storage. No prompts or generated text will be sent to an inference service.

## Planned curriculum

The six-lesson core will cover:

1. Base and instruction-tuned models use the same next-token mechanism.
2. Chat messages become one serialized sequence.
3. Special tokens are learned, model-specific markers rather than magic commands.
4. The model can propose an end marker, but the host controls stopping.
5. Conversation history is replayed context, not permanent memory or faithful introspection.
6. A model can continue a user turn as well as an assistant turn when given the corresponding prefix.

The history lesson includes an editable false assistant answer followed by a request for the model to explain its supposed earlier reasoning. This makes it visible that the transcript is supplied as context and that a plausible retrospective explanation is newly generated text, not access to a private memory of producing the earlier answer.

Tool calling and agents are intentionally outside this project and belong in a separate curriculum series.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the lesson experiments, interface design, model strategy, technical constraints, milestones, and acceptance criteria.

See [FEASIBILITY.md](FEASIBILITY.md) for measured browser/model results and the remaining cross-browser checks.

## Status

The first application shell renders the editable false-history lesson and SmolLM2's published chat template as synchronized conversation and sequence views. The next implementation slice adds local wllama generation and stopping events.

## Development

Node 22 is required.

```sh
npm install
npm run dev
npm run build
npm run lint
```

The Vite base path is `/ChatTemplatesIllustrated/`. Pushes to `main` build and deploy through GitHub Actions.
