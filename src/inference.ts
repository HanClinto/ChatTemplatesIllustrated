import { Wllama } from '@wllama/wllama/esm/index.js'
import wasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url'
import type { BrowserModel } from './models'

export interface GenerationResult {
  text: string
  finishReason: 'stop' | 'length' | 'content_filter' | null
  promptTokens: number
  generatedTokens: number
  tokenPieces: string[]
  eosTokenId: number
  eotTokenId: number
}

let engine: Wllama | null = null
let loadedModelId: BrowserModel['id'] | null = null

export async function loadBrowserModel(model: BrowserModel, onProgress: (fraction: number) => void) {
  if (loadedModelId === model.id && engine?.isModelLoaded()) return
  if (engine) await engine.exit()

  engine = new Wllama({ default: wasmUrl }, { suppressNativeLog: true })
  engine.setCompat(null)
  await engine.loadModelFromUrl(model.url, {
    n_ctx: 1024,
    n_batch: 256,
    n_threads: 1,
    n_gpu_layers: 0,
    useCache: true,
    progressCallback: ({ loaded, total }) => onProgress(total > 0 ? loaded / total : 0),
  })
  loadedModelId = model.id
  onProgress(1)
}

export async function generateCompletion(prompt: string, options: { ignoreEos: boolean; seed: number; temperature: number; signal: AbortSignal }): Promise<GenerationResult> {
  if (!engine?.isModelLoaded()) throw new Error('Load a model before generating.')

  const response = await engine.createCompletion({
    prompt,
    max_tokens: options.ignoreEos ? 72 : 120,
    temperature: options.temperature,
    top_k: 40,
    top_p: 0.95,
    seed: options.seed,
    ignore_eos: options.ignoreEos,
    logprobs: 5,
    n_probs: 5,
    abortSignal: options.signal,
  })
  const choice = response.choices[0]

  return {
    text: choice?.text ?? '',
    finishReason: choice?.finish_reason ?? null,
    promptTokens: response.usage.prompt_tokens,
    generatedTokens: response.usage.completion_tokens,
    tokenPieces: choice?.logprobs?.tokens ?? [],
    eosTokenId: engine.getEOS(),
    eotTokenId: engine.getEOT(),
  }
}

export async function clearModelCache() {
  if (!engine) {
    engine = new Wllama({ default: wasmUrl }, { suppressNativeLog: true })
    engine.setCompat(null)
  }
  await engine.cacheManager.clear()
  loadedModelId = null
}