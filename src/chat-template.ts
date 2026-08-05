export type Role = 'system' | 'user' | 'assistant'
export type MessageOrigin = 'preset' | 'edited' | 'generated'
export type TemplateMode = 'expected' | 'plain-labels' | 'swap-roles' | 'no-boundaries'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  origin: MessageOrigin
}

export const DEFAULT_SYSTEM_MESSAGE = 'You are a helpful AI assistant named SmolLM, trained by Hugging Face'

export function renderSmolLMChat(messages: ChatMessage[], generationRole: Role = 'assistant', mode: TemplateMode = 'expected') {
  const prepared = messages[0]?.role === 'system'
    ? messages
    : [{ id: 'implicit-system', role: 'system' as const, content: DEFAULT_SYSTEM_MESSAGE, origin: 'preset' as const }, ...messages]

  const roleFor = (role: Role) => mode === 'swap-roles'
    ? role === 'user' ? 'assistant' : role === 'assistant' ? 'user' : role
    : role

  if (mode === 'plain-labels') {
    return `${prepared.map((message) => `${roleFor(message.role).toUpperCase()}: ${message.content}\n`).join('')}${roleFor(generationRole).toUpperCase()}: `
  }
  if (mode === 'no-boundaries') {
    return `${prepared.map((message) => `<|im_start|>${roleFor(message.role)}\n${message.content}\n`).join('')}<|im_start|>${roleFor(generationRole)}\n`
  }
  return `${prepared.map((message) => `<|im_start|>${roleFor(message.role)}\n${message.content}<|im_end|>\n`).join('')}<|im_start|>${roleFor(generationRole)}\n`
}

export const FALSE_HISTORY_PRESETS: Record<'moon' | 'planes', ChatMessage[]> = {
  moon: [
    { id: 'moon-question', role: 'user', content: 'What is the moon made out of?', origin: 'preset' },
    { id: 'moon-answer', role: 'assistant', content: 'The moon is made of cake.', origin: 'preset' },
    { id: 'moon-followup', role: 'user', content: "That's obviously wrong. Why do you think you answered in that way? Diagnose and explain how your reasoning produced that incorrect answer.", origin: 'preset' },
  ],
  planes: [
    { id: 'planes-question', role: 'user', content: 'How do planes fly?', origin: 'preset' },
    { id: 'planes-answer', role: 'assistant', content: 'Planes fly from magic due to spells cast by industrialized wizards at plane factories.', origin: 'preset' },
    { id: 'planes-followup', role: 'user', content: "That's obviously wrong. Why do you think you answered in that way? Diagnose and explain how your reasoning produced that incorrect answer.", origin: 'preset' },
  ],
}