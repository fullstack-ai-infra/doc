import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { IButtonProps } from './types'
import { useGetEditor } from '@/components/editor'

export default function AddButton(props: IButtonProps) {
  const { currentNode, currentNodePos } = props
  const editor = useGetEditor()

  const handleAdd = useCallback(() => {
    if (currentNodePos !== -1) {
      const currentNodeSize = currentNode?.nodeSize || 0
      const insertPos = currentNodePos + currentNodeSize
      const currentNodeIsEmptyParagraph = currentNode?.type.name === 'paragraph' && currentNode?.content?.size === 0
      const focusPos = currentNodeIsEmptyParagraph ? currentNodePos + 2 : insertPos + 1

      editor &&
        editor
          .chain()
          .command(({ dispatch, tr, state }) => {
            if (dispatch) {
              if (currentNodeIsEmptyParagraph) {
                tr.insertText('/', currentNodePos, currentNodePos + 1)
              } else {
                tr.insert(insertPos, state.schema.nodes.paragraph.create(null))
              }
              return dispatch(tr)
            }
            return true
          })
          .focus(focusPos)
          .run()
    }
  }, [currentNode, currentNodePos, editor])

  if (editor == null) return

  return (
    <Button size="sm" variant="ghost" onClick={handleAdd} tabIndex={-1} className="px-1">
      <Plus className="h-4 w-4" />
    </Button>
  )
}
