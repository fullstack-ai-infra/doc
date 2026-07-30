import { useEffect } from 'react'
import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider'
import { Editor } from '@tiptap/core'
import { useEditorStore, ICollabUser } from '@/stores/editor-store'

export default function useCollabStateAndUsers(editor: Editor | null, provider: HocuspocusProvider | undefined) {
  // update collaborative state
  const setCollaborativeState = useEditorStore((s) => s.setCollaborativeState)
  useEffect(() => {
    if (provider == null) return
    const fn = (event: { status: WebSocketStatus }) => {
      setCollaborativeState(event.status)
    }
    provider?.on('status', fn)

    return () => {
      provider?.off('status', fn) // remove event listener in time
    }
  }, [provider, setCollaborativeState])

  // get collaboration users
  const setCollaborativeUsers = useEditorStore((s) => s.setCollaborativeUsers)
  useEffect(() => {
    const users = (editor?.storage.collaborationCursor?.users || []) as ICollabUser[]
    if (users.length <= 0) {
      setCollaborativeUsers([])
      return
    }

    const emails: string[] = []
    const filteredUsers = users.filter((user: ICollabUser) => {
      if (user.email == null) return false
      if (emails.includes(user.email)) {
        // console.log('duplicate user...', user.email, emails)
        return false
      }
      emails.push(user.email)
      return true
    })
    setCollaborativeUsers(filteredUsers)
  }, [editor?.storage.collaborationCursor?.users, setCollaborativeUsers])
}
