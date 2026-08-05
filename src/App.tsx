import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Braces, ExternalLink, MessageSquareText, Play, RotateCcw, ShieldCheck } from 'lucide-react'
import { FALSE_HISTORY_PRESETS, renderSmolLMChat, type ChatMessage, type Role } from './chat-template'
import { LESSONS } from './lessons'

const markerPattern = /(<\|im_start\|>|<\|im_end\|>)/g

function SerializedSequence({ text }: { text: string }) {
  return <pre className="sequence" aria-label="Serialized conversation">{text.split(markerPattern).map((part, index) => (
    part.startsWith('<|') ? <mark key={`${part}-${index}`}>{part}</mark> : <span key={`${part}-${index}`}>{part}</span>
  ))}</pre>
}

function App() {
  const [preset, setPreset] = useState<'moon' | 'planes'>('moon')
  const [messages, setMessages] = useState<ChatMessage[]>(() => structuredClone(FALSE_HISTORY_PRESETS.moon))
  const [generationRole, setGenerationRole] = useState<Role>('assistant')
  const [activeLesson, setActiveLesson] = useState('history')
  const serialized = useMemo(() => renderSmolLMChat(messages, generationRole), [messages, generationRole])
  const lesson = LESSONS.find((item) => item.id === activeLesson) ?? LESSONS[0]

  function selectPreset(nextPreset: 'moon' | 'planes') {
    setPreset(nextPreset)
    setMessages(structuredClone(FALSE_HISTORY_PRESETS[nextPreset]))
  }

  function editMessage(id: string, content: string) {
    setMessages((current) => current.map((message) => message.id === id ? { ...message, content, origin: 'edited' } : message))
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
      <p className="eyebrow">Interactive curriculum · Lesson 05</p>
      <h1>See the transcript<br />the model actually sees.</h1>
      <p className="lede">A chat interface looks like separate messages. Underneath, a template turns them into one sequence of text and learned markers.</p>
    </section>

    <nav className="lesson-strip" aria-label="Lessons">
      {LESSONS.map((item, index) => <button className={item.id === activeLesson ? 'active' : ''} key={item.id} onClick={() => setActiveLesson(item.id)} type="button"><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</button>)}
    </nav>

    <section className="lesson-thesis">
      <span>Current claim</span>
      <h2>{lesson.thesis}</h2>
      <p>{activeLesson === 'history' ? 'Edit the supposed earlier answer. The next response receives your edited transcript as context; it does not retrieve a private memory of producing that answer.' : 'This lesson is wired into the shared lab shell and will receive its guided experiment during the curriculum milestone.'}</p>
    </section>

    <section className="lab" aria-label="Chat template lab">
      <aside className="controls">
        <div className="section-title"><span>01</span><h2>Harness</h2></div>
        <label>Scenario</label>
        <div className="segmented">
          <button className={preset === 'moon' ? 'selected' : ''} onClick={() => selectPreset('moon')} type="button">Moon</button>
          <button className={preset === 'planes' ? 'selected' : ''} onClick={() => selectPreset('planes')} type="button">Planes</button>
        </div>
        <label>Continue as</label>
        <div className="segmented">
          <button className={generationRole === 'assistant' ? 'selected' : ''} onClick={() => setGenerationRole('assistant')} type="button">Assistant</button>
          <button className={generationRole === 'user' ? 'selected' : ''} onClick={() => setGenerationRole('user')} type="button">User</button>
        </div>
        <div className="model-readout"><span>Model</span><strong>SmolLM2 135M Instruct</strong><small>Not loaded · Q4 · ~88 MB</small></div>
        <button className="run-button" disabled type="button"><Play size={16} /> Model generation coming next</button>
        <button className="reset-button" onClick={() => selectPreset(preset)} type="button"><RotateCcw size={14} /> Reset transcript</button>
      </aside>

      <div className="conversation-pane">
        <div className="section-title"><span>02</span><h2>Conversation</h2><MessageSquareText size={16} /></div>
        <div className="messages">
          {messages.map((message) => <article className={`message ${message.role}`} key={message.id}>
            <div><strong>{message.role}</strong><small>{message.origin === 'edited' ? 'edited by you' : 'preset text'}</small></div>
            <textarea aria-label={`${message.role} message`} onChange={(event) => editMessage(message.id, event.target.value)} rows={Math.max(2, Math.ceil(message.content.length / 58))} value={message.content} />
          </article>)}
          <div className={`generation-slot ${generationRole}`}><ArrowRight size={15} /><span>Model continues here as <strong>{generationRole}</strong></span></div>
        </div>
      </div>

      <div className="sequence-pane">
        <div className="section-title"><span>03</span><h2>Serialized sequence</h2><Braces size={16} /></div>
        <div className="legend"><span><i className="marker-swatch" /> special marker</span><span><i className="text-swatch" /> message text</span></div>
        <SerializedSequence text={serialized} />
        <p className="sequence-note">Rendered with SmolLM2's published chat template. Markers are reserved vocabulary entries; line breaks and message text are ordinary sequence content.</p>
      </div>
    </section>

    <footer><p>Local inference · Static hosting · No conversation data leaves this page</p><a href="https://github.com/HanClinto/StatisticalNatureOfLLMs">Built alongside Statistical Nature of LLMs <ArrowRight size={14} /></a></footer>
  </main>
}

export default App