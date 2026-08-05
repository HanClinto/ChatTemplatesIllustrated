# Feasibility Results

Validated on August 5, 2026 against the public GitHub Pages deployment in a Chromium browser.

## Model artifacts

| Checkpoint | Artifact | License | Browser result |
| --- | --- | --- | --- |
| SmolLM2 135M Base | `QuantFactory/SmolLM2-135M-GGUF`, Q4_0 | Apache-2.0 | Loaded and generated successfully |
| SmolLM2 135M Instruct | `QuantFactory/SmolLM2-135M-Instruct-GGUF`, Q4_0 | Apache-2.0 | Loaded and generated successfully |

Both models download from Hugging Face on demand and are cached through wllama's browser cache manager. The GitHub Pages application remains static and sends no conversation text to an inference service.

## Published instruct template

The instruct checkpoint embeds this ChatML-style structure:

```text
<|im_start|>system
...<|im_end|>
<|im_start|>user
...<|im_end|>
<|im_start|>assistant
```

The tokenizer configuration reserves `<|im_start|>` as ID 1 and `<|im_end|>` as ID 2. wllama reports ID 2 as both EOS and EOT for this checkpoint.

## Reproducible experiments

With seed 42, temperature 0.3, and the moon/cake false-history preset:

- **Instruct checkpoint:** consumed 83 prompt tokens, generated a 21-token rationalization, and stopped on EOS/EOT ID 2.
- **Ignore EOS:** generated all 72 allowed tokens and stopped at the application's safety cap. It repeated and extended the cake rationale rather than cleanly ending the turn.
- **Base checkpoint:** consumed the same 83-token prompt, produced looping and template-like fragments, and reached the 120-token maximum instead of ending a clean chat turn.
- **User-role prefix:** the instruct model consumed 82 prompt tokens, generated a 20-token plausible user continuation, and stopped on EOS/EOT ID 2.

These outputs are examples from one small model, not behavioral guarantees for arbitrary prompts or other model families. The important reproducible observations are the different stop reasons, the changed behavior under the matched base checkpoint, and the model's ability to continue text after either role prefix.

## Confirmed technical boundaries

- Static GitHub Pages can serve the application and bundled single-thread wllama WASM without cross-origin isolation headers.
- Hugging Face model downloads work from the deployed origin. An aborted speculative `HEAD` request may appear in Chromium while the actual model download still succeeds.
- wllama v3 reports generated token pieces, usage counts, finish reason, EOS, and EOT metadata.
- wllama v3 does not expose its former public prompt `tokenize`/`detokenize` methods. The current interface therefore shows exact rendered template text and model-reported prompt-token counts, but does not claim exact prompt token boundaries or IDs.
- Lazy-loading inference keeps wllama out of the initial JavaScript chunk. The current production build is approximately 209 KB for the initial app and 303 KB for the deferred inference chunk, before compression.

## Still outstanding

- Repeat model loading and generation in current Firefox and Safari releases.
- Verify mobile layout in a browser with an actual 390-pixel CSS viewport; the integrated test browser clamps its content panel below the application's supported 320-pixel minimum.
- Select deterministic prompts for every template-mutation condition and document how much output variation remains across browser/runtime versions.
- Investigate exact prompt token inspection only if a tokenizer can be guaranteed to match the loaded GGUF vocabulary and special-token configuration.