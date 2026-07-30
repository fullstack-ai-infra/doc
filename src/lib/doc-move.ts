import type { IDoc } from '@/stores/docs-store'

export interface DocMoveIntent {
  draggedId: string
  parentId: string | null
  previousSiblingId: string | null
  nextSiblingId: string | null
}

export interface DocMoveUpdate {
  id: string
  parentId: string | null
  sortOrder: number
}

export function applyDocMoveUpdates(docs: IDoc[], updates: DocMoveUpdate[]) {
  const updatesById = new Map(updates.map((update) => [update.id, update]))
  return docs.map((doc) => {
    const update = updatesById.get(doc.id)
    return update ? { ...doc, ...update } : doc
  })
}
