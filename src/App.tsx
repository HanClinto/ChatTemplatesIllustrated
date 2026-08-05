import { useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Braces, ExternalLink, LoaderCircle, MessageSquareText, Play, RotateCcw, ShieldCheck, Square, Trash2 } from 'lucide-react'
import { FALSE_HISTORY_PRESETS, renderSmolLMChat, type ChatMessage, type Role, type TemplateMode } from './chat-template'
import type { GenerationResult, GenerationUpdate, LoadUpdate, StorageMode } from './inference'
import { LESSONS } from './lessons'
import { MODELS } from './models'

const markerPattern = /(<\|im_start\|>|<\|im_end\|>)/g
type ActivityPhase = LoadUpdate['phase'] | GenerationUpdate['phase']

interface ActivityStep {
  phase: ActivityPhase
  detail: string
}

const activityActors: Record<ActivityPhase, string> = {
  storage: 'Browser',
  loading: 'Runtime',
  initializing: 'Runtime',
  ready: 'Model',
  prefilling: 'Harness',
  generating: 'Model',
}

function SerializedSequence({ text }: { text: string }) {
  return <pre className="sequence" aria-label="Serialized conversation">{text.split(markerPattern).map((part, index) => (
    part.startsWith('<|') ? <mark key={`${part}-${index}`}>{part}</mark> : <span key={`${part}-${index}`}>{part}</span>
  ))}</pre>
}

function App() {
  const [preset, setPreset] = useState<'moon' | 'planes'>('moon')
  const [messages, setMessages] = useState<ChatMessage[]>(() => structuredClone(FALSE_HISTORY_PRESETS.moon))
  const [generationRole, setGenerationRole] = useState<Role>('assistant')
  const [activeLesson, setActiveLesson] = useState(() => {
    const linkedLesson = window.location.hash.replace(/^#lesson-/, '')
    return LESSONS.some((item) => item.id === linkedLesson) ? linkedLesson : 'history'
  })
  const [templateMode, setTemplateMode] = useState<TemplateMode>('expected')
  const [modelId, setModelId] = useState(MODELS[1].id)
  const [loadedModelId, setLoadedModelId] = useState<string | null>(null)
  const [storageMode, setStorageMode] = useState<StorageMode | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'generating'>('idle')
  const [progress, setProgress] = useState(0)
  const [ignoreEos, setIgnoreEos] = useState(false)
  const [temperature, setTemperature] = useState(0.3)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [partialText, setPartialText] = useState('')
  const [activitySteps, setActivitySteps] = useState<ActivityStep[]>([])
  const [error, setError] = useState<string | null>(null)
  const abortController = useRef<AbortController | null>(null)
  const serialized = useMemo(() => renderSmolLMChat(messages, generationRole, templateMode), [messages, generationRole, templateMode])
  const lesson = LESSONS.find((item) => item.id === activeLesson) ?? LESSONS[0]
  const lessonNumber = LESSONS.findIndex((item) => item.id === lesson.id) + 1
  const model = MODELS.find((item) => item.id === modelId) ?? MODELS[1]
  const currentActivity = activitySteps.at(-1)

  function recordActivity(step: ActivityStep) {
    setActivitySteps((current) => current.at(-1)?.phase === step.phase ? [...current.slice(0, -1), step] : [...current, step])
  }

  function selectPreset(nextPreset: 'moon' | 'planes') {
    setPreset(nextPreset)
    setMessages(structuredClone(FALSE_HISTORY_PRESETS[nextPreset]))
    setResult(null)
  }

  function editMessage(id: string, content: string) {
    setMessages((current) => current.map((message) => message.id === id ? { ...message, content, origin: 'edited' } : message))
    setResult(null)
  }

  function selectLesson(id: string) {
    setActiveLesson(id)
    window.history.replaceState(null, '', `#lesson-${id}`)
    setResult(null)
    if (id !== 'learned-markers') setTemplateMode('expected')
    if (id === 'either-side') setGenerationRole('user')
    if (id === 'host-stops') setIgnoreEos(false)
  }

  async function runGeneration() {
    setError(null)
    setResult(null)
    setPartialText('')
    setActivitySteps([])
    try {
      const { generateCompletion, loadBrowserModel } = await import('./inference')
      if (loadedModelId !== model.id) {
        setStatus('loading')
        setProgress(0)
        const nextStorageMode = await loadBrowserModel(model, setProgress, recordActivity)
        setStorageMode(nextStorageMode)
        setLoadedModelId(model.id)
      }
      setStatus('generating')
      abortController.current = new AbortController()
      const completion = await generateCompletion(serialized, {
        ignoreEos,
        seed: 42,
        temperature,
        signal: abortController.current.signal,
      }, (update) => {
        setPartialText(update.partialText)
        recordActivity({
          phase: update.phase,
          detail: update.phase === 'prefilling' ? `Prefilling the serialized prompt (${serialized.length} characters)...` : `Generating output: ${update.generatedTokens} token${update.generatedTokens === 1 ? '' : 's'}`,
        })
      })
      setResult(completion)
    } catch (caught) {
      if ((caught as Error).name !== 'AbortError') setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      abortController.current = null
      setStatus('idle')
    }
  }

  async function clearCache() {
    setStatus('loading')
    setError(null)
    try {
      const { clearModelCache } = await import('./inference')
      await clearModelCache()
      setLoadedModelId(null)
      setStorageMode(null)
      setProgress(0)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setStatus('idle')
    }
  }

  return <main>
    <header className="topbar">
      <a className="wordmark" href="#top"><BookOpen size={19} /> Chat Templates Illustrated</a>
      <div className="topbar-actions">
        <span><ShieldCheck size={15} /> Runs in your browser</span>
        <a href="https://github.com/HanClinto/ChatTemplatesIllustrated"><ExternalLink size={17} /><span>Source</span></a>
      </div>
    </header>

    <section className="intro" id="top">
      <p className="eyebrow">Interactive curriculum · Lesson {String(lessonNumber).padStart(2, '0')}</p>
      <h1>See the transcript<br />the model actually sees.</h1>
      <p className="lede">A chat interface looks like separate messages. Underneath, a template turns them into one sequence of text and learned markers.</p>
    </section>

    <nav className="lesson-strip" aria-label="Lessons">
      {LESSONS.map((item, index) => <button className={item.id === activeLesson ? 'active' : ''} key={item.id} onClick={() => selectLesson(item.id)} type="button"><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</button>)}
    </nav>

    <section className="lesson-thesis">
      <span>Current claim</span>
      <h2>{lesson.thesis}</h2>
      <div><p>{lesson.explanation}</p><p className="try-this"><strong>Try this:</strong> {lesson.experiment}</p></div>
    </section>

    <section className="lab" aria-label="Chat template lab">
      <aside className="controls">
        <div className="section-title"><span>01</span><h2>Harness</h2></div>
        <label>Scenario</label>
        <div className="segmented">
          <button className={preset === 'moon' ? 'selected' : ''} onClick={() => selectPreset('moon')} type="button">Moon</button>
          <button className={preset === 'planes' ? 'selected' : ''} onClick={() => selectPreset('planes')} type="button">Planes</button>
        </div>
        <label>Template treatment</label>
        <select disabled={status !== 'idle'} onChange={(event) => { setTemplateMode(event.target.value as TemplateMode); setResult(null) }} value={templateMode}>
          <option value="expected">Expected special markers</option>
          <option value="plain-labels">Ordinary text labels</option>
          <option value="no-boundaries">Remove end markers</option>
          <option value="swap-roles">Swap user / assistant</option>
        </select>
        <label>Continue as</label>
        <div className="segmented">
          <button className={generationRole === 'assistant' ? 'selected' : ''} onClick={() => setGenerationRole('assistant')} type="button">Assistant</button>
          <button className={generationRole === 'user' ? 'selected' : ''} onClick={() => setGenerationRole('user')} type="button">User</button>
        </div>
        <label>Checkpoint</label>
        <div className="model-options">
          {MODELS.map((item) => <button className={item.id === model.id ? 'selected' : ''} disabled={status !== 'idle'} key={item.id} onClick={() => { setModelId(item.id); setResult(null) }} type="button"><strong>{item.kind === 'base' ? 'Base' : 'Instruct'}</strong><span>{item.size}</span><small>{item.description}</small></button>)}
        </div>
        <label className="toggle"><input checked={ignoreEos} onChange={(event) => { setIgnoreEos(event.target.checked); setResult(null) }} type="checkbox" /> Ignore EOS for this run</label>
        <div className="temperature"><label htmlFor="temperature">Temperature <strong>{temperature.toFixed(1)}</strong></label><input id="temperature" max="1.5" min="0" onChange={(event) => setTemperature(Number(event.target.value))} step="0.1" type="range" value={temperature} /></div>
        <div aria-live="polite" className="model-readout"><span>Status</span><strong>{status === 'loading' ? 'Loading model' : status === 'generating' ? 'Inference running' : loadedModelId === model.id ? `${model.name} ready` : `${model.name} not loaded`}</strong><small>{(status !== 'idle' ? currentActivity?.detail : null) ?? (status === 'loading' ? `Downloading ${Math.round(progress * 100)}%` : ignoreEos ? 'Hard cap: 72 generated tokens' : 'Stops on the model end marker')}</small></div>
        {storageMode === 'memory' && <p className="storage-warning" role="status">Persistent model caching is unavailable in this browser. The model is kept in memory for this tab and will download again next session.</p>}
        {status === 'generating'
          ? <button className="run-button stop" onClick={() => abortController.current?.abort()} type="button"><Square size={15} /> Stop generation</button>
          : <button className="run-button" disabled={status !== 'idle'} onClick={runGeneration} type="button">{status === 'loading' ? <LoaderCircle className="spin" size={16} /> : <Play size={16} />} {loadedModelId === model.id ? 'Generate continuation' : 'Load model & generate'}</button>}
        <button className="reset-button" onClick={() => selectPreset(preset)} type="button"><RotateCcw size={14} /> Reset transcript</button>
        <button className="reset-button" disabled={status !== 'idle'} onClick={clearCache} type="button"><Trash2 size={14} /> Clear model cache</button>
        {error && <p className="error-message" role="alert">{error}</p>}
      </aside>

      <div className="conversation-pane">
        <div className="section-title"><span>02</span><h2>Conversation</h2><MessageSquareText size={16} /></div>
        <div className="messages">
          {messages.map((message) => <article className={`message ${message.role}`} key={message.id}>
            <div><strong>{message.role}</strong><small>{message.origin === 'edited' ? 'edited by you' : 'preset text'}</small></div>
            <textarea aria-label={`${message.role} message`} onChange={(event) => editMessage(message.id, event.target.value)} rows={Math.max(2, Math.ceil(message.content.length / 58))} value={message.content} />
          </article>)}
          {result || status === 'generating' ? <article className={`message generated ${generationRole}`}><div><strong>{generationRole}</strong><small>{result ? 'generated now' : 'generating now'}</small></div><p>{result?.text || partialText || 'Prefilling prompt...'}</p></article> : <div className={`generation-slot ${generationRole}`}><ArrowRight size={15} /><span>Model continues here as <strong>{generationRole}</strong></span></div>}
        </div>
      </div>

      <div className="sequence-pane">
        <div className="section-title"><span>03</span><h2>Serialized sequence</h2><Braces size={16} /></div>
        <div className="legend"><span><i className="marker-swatch" /> special marker</span><span><i className="text-swatch" /> message text</span></div>
        <SerializedSequence text={serialized} />
        <p className="sequence-note">{templateMode === 'expected' ? "Rendered with SmolLM2's published chat template." : 'This is a deliberate mutation of the published template.'} Highlighted markers are reserved vocabulary entries; line breaks and message text are ordinary sequence content.</p>
        <div className="timeline">
          <h3>Generation timeline</h3>
          {!result && activitySteps.length === 0 && <p>Run the model to reveal loading, prefill, generation, and the harness stop event.</p>}
          {!result && activitySteps.length > 0 && <ol aria-live="polite">
            {activitySteps.map((step, index) => <li className={index === activitySteps.length - 1 ? 'active' : ''} key={step.phase}><span>{activityActors[step.phase]}</span><p>{step.detail}</p></li>)}
          </ol>}
          {result && <ol>
            <li><span>Harness</span><p>{result.promptTokens === null ? `Prefilled the ${result.promptCharacters}-character serialized prompt. This streaming API does not report its token count.` : `Sent ${result.promptTokens} prompt tokens from the sequence above.`}</p></li>
            <li><span>Model</span><p>Generated {result.generatedTokens} tokens one piece at a time.</p></li>
            <li><span>Harness</span><p>{result.finishReason === 'stop' ? `Stopped after an end-of-generation marker (EOS ${result.eosTokenId}, EOT ${result.eotTokenId}).` : result.finishReason === 'length' ? `Stopped at the ${ignoreEos ? '72-token safety cap while EOS was ignored' : 'maximum-token limit'}.` : `Generation finished with reason: ${result.finishReason ?? 'unknown'}.`}</p></li>
          </ol>}
          {result && result.promptTokens !== null && <div className="context-meter"><div><span>Context used</span><strong>{result.promptTokens + result.generatedTokens} / 1,024 tokens</strong></div><meter max="1024" value={result.promptTokens + result.generatedTokens} /></div>}
          {result && result.promptTokens === null && <div className="context-meter"><div><span>Generated output</span><strong>{result.generatedTokens} tokens · 1,024-token context limit</strong></div></div>}
        </div>
        {result && result.tokenPieces.length > 0 && <div className="token-inspector"><h3>Generated token pieces</h3><p>Selecting each piece happened before the next piece was scored. Spaces appear as <code>·</code> and line breaks as <code>↵</code>.</p><div>{result.tokenPieces.map((token, index) => <code key={`${token}-${index}`} title={`Generated token ${index + 1}`}>{token.replaceAll(' ', '·').replaceAll('\n', '↵')}</code>)}</div></div>}
      </div>
    </section>

    <footer><p>Local inference · Static hosting · No conversation data leaves this page</p><a href="https://github.com/HanClinto/StatisticalNatureOfLLMs">Built alongside Statistical Nature of LLMs <ArrowRight size={14} /></a></footer>
  </main>
}

export default App