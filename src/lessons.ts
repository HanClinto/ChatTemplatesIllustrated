export interface Lesson {
  id: string
  label: string
  thesis: string
  explanation: string
  experiment: string
}

export const LESSONS: Lesson[] = [
  {
    id: 'same-engine',
    label: 'Base vs. chat',
    thesis: 'A chatbot is still a next-token model.',
    explanation: 'The matched checkpoints use the same autoregressive mechanism. Post-training changes which continuations are likely, especially around chat-formatted text.',
    experiment: 'Generate once with Instruct, then select Base and rerun without changing the transcript, seed, or temperature.',
  },
  {
    id: 'one-sequence',
    label: 'Serialization',
    thesis: 'Chat bubbles become one sequence.',
    explanation: 'The harness turns message objects into one ordered prefix. The assistant marker at the end asks the model to continue that role.',
    experiment: 'Edit any bubble and watch the sequence update immediately. Nothing is sent to a model until you choose Generate.',
  },
  {
    id: 'learned-markers',
    label: 'Special tokens',
    thesis: 'Special tokens are learned markers, not magic commands.',
    explanation: 'SmolLM2 learned patterns around reserved marker IDs. Ordinary role labels, missing boundaries, and swapped roles condition it differently.',
    experiment: 'Use Template treatment to compare the expected template with ordinary labels, missing end markers, and swapped role markers.',
  },
  {
    id: 'host-stops',
    label: 'Stopping',
    thesis: 'The model proposes an ending; the harness stops.',
    explanation: 'For this checkpoint, token ID 2 is both EOS and EOT. The model predicts it; the surrounding software turns that prediction into a stop event.',
    experiment: 'Generate normally, then enable Ignore EOS and rerun. The override has a hard 72-token safety cap.',
  },
  {
    id: 'history',
    label: 'History',
    thesis: 'Conversation history is the next prompt.',
    explanation: 'The model receives the supplied transcript as context. A retrospective explanation is newly generated text, not retrieval of a private memory of writing the inserted answer.',
    experiment: 'Generate an explanation, edit the false assistant answer, and regenerate with the same settings. Try the Planes preset too.',
  },
  {
    id: 'either-side',
    label: 'Roles',
    thesis: 'The model can continue either side of the transcript.',
    explanation: 'Next-token prediction is not intrinsically limited to assistant prose. The final role marker changes which kind of continuation the model has learned to produce.',
    experiment: 'Generate as Assistant, switch Continue as to User, and generate again. This predicts plausible text, not a real user’s intent.',
  },
]