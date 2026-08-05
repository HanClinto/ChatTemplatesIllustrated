export interface BrowserModel {
  id: 'smollm2-base' | 'smollm2-instruct'
  name: string
  kind: 'base' | 'chat'
  size: string
  url: string
  description: string
}

export const MODELS: BrowserModel[] = [
  {
    id: 'smollm2-base',
    name: 'SmolLM2 135M Base',
    kind: 'base',
    size: '92 MB',
    url: 'https://huggingface.co/QuantFactory/SmolLM2-135M-GGUF/resolve/main/SmolLM2-135M.Q4_0.gguf',
    description: 'Pretrained to continue text, before instruction tuning.',
  },
  {
    id: 'smollm2-instruct',
    name: 'SmolLM2 135M Instruct',
    kind: 'chat',
    size: '88 MB',
    url: 'https://huggingface.co/QuantFactory/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct.Q4_0.gguf',
    description: 'The matched checkpoint post-trained to follow chat turns.',
  },
]