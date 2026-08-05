export interface Lesson {
  id: string
  label: string
  thesis: string
}

export const LESSONS: Lesson[] = [
  { id: 'same-engine', label: 'Base vs. chat', thesis: 'A chatbot is still a next-token model.' },
  { id: 'one-sequence', label: 'Serialization', thesis: 'Chat bubbles become one sequence.' },
  { id: 'learned-markers', label: 'Special tokens', thesis: 'Special tokens are learned markers, not magic commands.' },
  { id: 'host-stops', label: 'Stopping', thesis: 'The model proposes an ending; the harness stops.' },
  { id: 'history', label: 'History', thesis: 'Conversation history is the next prompt.' },
  { id: 'either-side', label: 'Roles', thesis: 'The model can continue either side of the transcript.' },
]