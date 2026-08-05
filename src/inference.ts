import { CacheManager, Wllama } from '@wllama/wllama/esm/index.js'
import type { StorageBackend } from '@wllama/wllama/esm/storage/index.js'
import wasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url'
import type { BrowserModel } from './models'

export type StorageMode = 'persistent' | 'memory'

export interface GenerationResult {
  text: string
  finishReason: 'stop' | 'length' | 'content_filter' | null
  promptTokens: number | null
  promptCharacters: number
  generatedTokens: number
  tokenPieces: string[]
  eosTokenId: number
  eotTokenId: number
}

export interface GenerationUpdate {
  phase: 'prefilling' | 'generating'
  generatedTokens: number
  partialText: string
}

export interface LoadUpdate {
  phase: 'storage' | 'loading' | 'initializing' | 'ready'
  detail: string
}

let engine: Wllama | null = null
let loadedModelId: BrowserModel['id'] | null = null
let storageMode: StorageMode | null = null

class MemoryStorageBackend implements StorageBackend {
  private files = new Map<string, Blob>()

  isSupported() {
    return true
  }

  async read(key: string) {
    return this.files.get(key) ?? null
  }

  async write(key: string, stream: ReadableStream) {
    const chunks: ArrayBuffer[] = []
    const reader = stream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(Uint8Array.from(value).buffer)
    }
    this.files.set(key, new Blob(chunks))
  }

  async getSize(key: string) {
    return this.files.get(key)?.size ?? -1
  }

  async list() {
    return Array.from(this.files, ([key, value]) => ({ key, size: value.size }))
  }

  async delete(key: string) {
    this.files.delete(key)
  }
}

async function createEngine(): Promise<{ instance: Wllama; mode: StorageMode }> {
  try {
    if (!navigator.storage?.getDirectory) throw new Error('OPFS is unavailable')
    await navigator.storage.getDirectory()
    return {
      instance: new Wllama({ default: wasmUrl }, { suppressNativeLog: true }),
      mode: 'persistent',
    }
  } catch {
    const cacheManager = new CacheManager([new MemoryStorageBackend()])
    return {
      instance: new Wllama({ default: wasmUrl }, { suppressNativeLog: true, cacheManager }),
      mode: 'memory',
    }
  }
}

export async function loadBrowserModel(model: BrowserModel, onProgress: (fraction: number) => void, onUpdate?: (update: LoadUpdate) => void): Promise<StorageMode> {
  if (loadedModelId === model.id && engine?.isModelLoaded()) {
    onUpdate?.({ phase: 'ready', detail: `${model.name} is already loaded.` })
    return storageMode ?? 'persistent'
  }
  if (engine) await engine.exit()

  onUpdate?.({ phase: 'storage', detail: 'Checking persistent model storage...' })
  const created = await createEngine()
  engine = created.instance
  storageMode = created.mode
  engine.setCompat(null)
  onUpdate?.({ phase: 'loading', detail: created.mode === 'persistent' ? 'Reading cached model data or downloading it...' : 'Downloading model data for this tab...' })
  await engine.loadModelFromUrl(model.url, {
    n_ctx: 1024,
    n_batch: 256,
    n_threads: 1,
    n_gpu_layers: 0,
    useCache: true,
    progressCallback: ({ loaded, total }) => {
      const fraction = total > 0 ? loaded / total : 0
      onProgress(fraction)
      onUpdate?.({ phase: fraction >= 1 ? 'initializing' : 'loading', detail: fraction >= 1 ? 'Model data ready. Initializing the inference runtime...' : `Loading model data: ${Math.round(fraction * 100)}%` })
    },
  })
  loadedModelId = model.id
  onProgress(1)
  onUpdate?.({ phase: 'ready', detail: `${model.name} loaded and ready.` })
  return storageMode
}

export async function generateCompletion(prompt: string, options: { ignoreEos: boolean; seed: number; temperature: number; signal: AbortSignal }, onUpdate?: (update: GenerationUpdate) => void): Promise<GenerationResult> {
  if (!engine?.isModelLoaded()) throw new Error('Load a model before generating.')

  let text = ''
  let finishReason: GenerationResult['finishReason'] = null
  let promptTokens: number | null = null
  let generatedTokens = 0
  const tokenPieces: string[] = []
  onUpdate?.({ phase: 'prefilling', generatedTokens: 0, partialText: '' })

  const maxTokens = options.ignoreEos ? 72 : 120
  await engine.createCompletion({
    prompt,
    stream: true,
    max_tokens: maxTokens,
    temperature: options.temperature,
    top_k: 40,
    top_p: 0.95,
    seed: options.seed,
    ignore_eos: options.ignoreEos,
    logprobs: 5,
    n_probs: 5,
    abortSignal: options.signal,
    onData: (chunk) => {
      const choice = chunk.choices[0]
      const token = (choice?.logprobs as unknown as { content?: Array<{ id: number }> } | null)?.content?.[0]
      if (choice?.text) {
        text += choice.text
        tokenPieces.push(choice.text)
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason
      if (token && engine?.isTokenEOG(token.id)) finishReason = 'stop'
      promptTokens = chunk.usage?.prompt_tokens ?? chunk.timings?.prompt_n ?? promptTokens
      generatedTokens = chunk.usage?.completion_tokens ?? chunk.timings?.predicted_n ?? tokenPieces.length
      onUpdate?.({ phase: 'generating', generatedTokens, partialText: text })
    },
  })
  if (!finishReason && generatedTokens >= maxTokens) finishReason = 'length'

  return {
    text,
    finishReason,
    promptTokens,
    promptCharacters: prompt.length,
    generatedTokens,
    tokenPieces,
    eosTokenId: engine.getEOS(),
    eotTokenId: engine.getEOT(),
  }
}

export async function clearModelCache() {
  if (!engine) {
    const created = await createEngine()
    engine = created.instance
    storageMode = created.mode
    engine.setCompat(null)
  }
  await engine.cacheManager.clear()
  loadedModelId = null
}