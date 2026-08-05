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

## Status

Planning and feasibility validation. The first implementation milestone is a small wllama prototype that verifies the matched base/instruct checkpoints, chat-template rendering, EOS/EOT behavior, capped generation past an end marker, and available token-inspection fidelity.
