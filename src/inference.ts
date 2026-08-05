import { CacheManager, Wllama } from '@wllama/wllama/esm/index.js'
import type { StorageBackend } from '@wllama/wllama/esm/storage/index.js'
import wasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url'
import type { BrowserModel } from './models'

export type StorageMode = 'persistent' | 'memory'

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

export async function loadBrowserModel(model: BrowserModel, onProgress: (fraction: number) => void): Promise<StorageMode> {
  if (loadedModelId === model.id && engine?.isModelLoaded()) return storageMode ?? 'persistent'
  if (engine) await engine.exit()

  const created = await createEngine()
  engine = created.instance
  storageMode = created.mode
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
  return storageMode
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
    const created = await createEngine()
    engine = created.instance
    storageMode = created.mode
    engine.setCompat(null)
  }
  await engine.cacheManager.clear()
  loadedModelId = null
}