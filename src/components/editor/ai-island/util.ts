import { DOC_TITLE_INPUT_ID } from '@/constants'

export function getTitle(): string {
  const titleInput = document.getElementById(DOC_TITLE_INPUT_ID) as HTMLInputElement
  return titleInput?.value || ''
}
