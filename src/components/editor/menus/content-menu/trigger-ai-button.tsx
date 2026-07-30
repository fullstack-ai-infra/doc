import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { IButtonProps } from './types'
import { EVENT_KEY_FOCUS_AI } from '@/constants'
import emitter from '@/lib/emitter'
import { useGetEditor } from '@/components/editor'
import { useDialogStore } from '@/stores/dialog-store'

export default function TriggerAIButton(props: IButtonProps) {
  const { currentNode, currentNodePos } = props
  const editor = useGetEditor()

  const AIPanelOpen = useDialogStore((s) => s.AIPanelOpen)
  const setAIPanelOpen = useDialogStore((s) => s.setAIPanelOpen)

  const handleClick = useCallback(() => {
    if (currentNodePos !== -1) {
      const currentNodeSize = currentNode?.nodeSize || 0
      const insertPos = currentNodePos + currentNodeSize
      const currentNodeIsEmptyParagraph = currentNode?.type.name === 'paragraph' && currentNode?.content?.size === 0
      const focusPos = currentNodeIsEmptyParagraph ? currentNodePos : insertPos + 1

      editor &&
        editor
          .chain()
          .command(({ dispatch, tr, state }) => {
            if (dispatch) {
              if (!currentNodeIsEmptyParagraph) {
                tr.insert(insertPos, state.schema.nodes.paragraph.create(null))
              }
              return dispatch(tr)
            }
            return true
          })
          .focus(focusPos)
          .run()

      setTimeout(() => {
        if (AIPanelOpen) {
          emitter.emit(EVENT_KEY_FOCUS_AI)
        } else {
          setAIPanelOpen(true)
          setTimeout(() => {
            emitter.emit(EVENT_KEY_FOCUS_AI)
          }, 500)
        }
      }, 100)
    }
  }, [currentNode, currentNodePos, editor, AIPanelOpen, setAIPanelOpen])

  return (
    <Button size="sm" variant="ghost" onClick={handleClick} tabIndex={-1} className="px-1 text-blue-500">
      <Sparkles className="h-4 w-4" />
    </Button>
  )
}
