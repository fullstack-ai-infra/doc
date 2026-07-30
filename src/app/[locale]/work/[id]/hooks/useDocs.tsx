import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { nav, getDescendantsIds } from '../@directory/util'
import { post, patch, IAjaxRes } from '@/lib/ajax'
import { nextSortOrder } from '@/lib/doc-sort-order'
import { useDocsStore } from '@/stores/docs-store'
import { useUserStore } from '@/stores/user-store'
import { useDialogStore } from '@/stores/dialog-store'

export default function useDocs() {
  const { toast } = useToast()
  const tDocItem = useTranslations('docItem')
  const tTrash = useTranslations('trash')
  const docs = useDocsStore((s) => s.docs)
  const setCreating = useDocsStore((s) => s.setCreating)
  const addDoc = useDocsStore((s) => s.addDoc)
  const removeDoc = useDocsStore((s) => s.removeDoc)
  const curDocId = useDocsStore((s) => s.curDocId)
  const userInfo = useUserStore((s) => s.userInfo)
  const setTrashDialogOpen = useDialogStore((s) => s.setTrashDialogOpen)

  // 创建文档
  const createDoc = useCallback(
    (opt?: { parentId: string | null }) => {
      const { parentId = null } = opt || {}
      const newId = crypto.randomUUID()

      if (userInfo == null) {
        throw new Error('User info is required')
      }

      const siblingMaxSortOrder = docs
        .filter((doc) => doc.parentId === parentId)
        .reduce<number | null>((max, doc) => {
          if (doc.sortOrder == null) return max
          if (max == null) return doc.sortOrder
          return Math.max(max, doc.sortOrder)
        }, null)
      const sortOrder = nextSortOrder(siblingMaxSortOrder)

      // add doc, update docs
      addDoc({
        id: newId,
        icon: null,
        title: '',
        parentId,
        sortOrder,
        userId: userInfo.id,
      })

      // 跳转
      nav(newId)

      // 异步创建
      setCreating(true)
      post('/api/doc', { id: newId, parentId }).then((resData: IAjaxRes) => {
        if (resData.errno === 0) {
          setCreating(false)
          return
        }

        // 提示错误
        toast({
          variant: 'destructive',
          description: resData.msg || tDocItem('duplicateFailed'),
        })
        setTimeout(() => {
          location.href = '/work/0'
        }, 1500)
      })
    },
    [addDoc, docs, toast, userInfo, setCreating, tDocItem]
  )

  // 删除文档
  const deleteDoc = useCallback(
    (id: string) => {
      // 找到所有下级节点 ids
      const descendantsIds = getDescendantsIds(id, docs)
      // 要删除的所有 ids ，包括当前节点
      const ids = [...descendantsIds, id]

      // 异步执行软删除
      patch('/api/doc', { ids, data: { isDeleted: true } }).then((resData: IAjaxRes) => {
        if (resData.errno !== 0) {
          toast({
            variant: 'destructive',
            description: resData.msg || tDocItem('moveFailed'),
          })
          return
        }
        toast({
          description: tTrash('deleteSuccess', { count: ids.length }),
          action: (
            <ToastAction altText={tTrash('openTrash')} asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTrashDialogOpen(true)
                }}
              >
                {tTrash('openTrash')}
              </Button>
            </ToastAction>
          ),
        })
      })

      // remove doc, update docs
      removeDoc(id)

      // 跳转到首页
      if (id === curDocId) nav('0')
    },
    [docs, removeDoc, toast, curDocId, setTrashDialogOpen, tDocItem, tTrash]
  )

  return { createDoc, deleteDoc }
}
