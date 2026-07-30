import { useState, useCallback } from 'react'
import { uploadImageFn } from '@/components/editor/utils/api'
import { useToast } from '@/components/ui/use-toast'
import { getImageSize } from '@/components/editor/utils/img'
import { useTranslations } from 'next-intl'

const useUploader = ({ onUpload }: { onUpload: (url: string, ratio: number) => void }) => {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const t = useTranslations('editor')

  const uploadFile = useCallback(
    async (file: File) => {
      setLoading(true)
      const { width = NaN, height = NaN } = await getImageSize(file) // 获取图片尺寸
      const ratio = parseFloat((width / height).toFixed(2)) // 计算宽高比例
      try {
        const url = await uploadImageFn(file) // 上传图片
        onUpload(url, ratio) // 上传成功后，调用 onUpload 方法
      } catch (errPayload: any) {
        console.error(errPayload)
        const error = errPayload?.response?.data?.error || t('uploadFailed')
        toast({
          variant: 'destructive',
          description: error,
        })
      }
      setLoading(false)
    },
    [onUpload, toast, t]
  )

  return { loading, uploadFile }
}

export default useUploader
