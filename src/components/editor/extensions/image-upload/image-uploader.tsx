import { useCallback, ChangeEvent, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Image as ImageIcon, Upload } from 'lucide-react'
import useUploader from './hooks/useUploader'
import useDropZone from './hooks/useDropZone'
import { getWidthPercent } from '@/components/editor/utils/img'
import { useTranslations } from 'next-intl'

interface ImageUploadViewProps {
  onUpload: (url: string, ratio: number) => void
  setCurUploaderRange: () => void
}

export default function ImageUploadView(props: ImageUploadViewProps) {
  const { onUpload, setCurUploaderRange } = props
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [widthPercent, setWidthPercent] = useState<number>(100)
  const imgRef = useRef<HTMLImageElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  function handleUploadClick(e: React.MouseEvent<HTMLDivElement>) {
    if (draggedInside) return
    setCurUploaderRange() // 设置当前上传图片的位置
    fileInputRef.current?.click()
  }

  const { loading, uploadFile } = useUploader({ onUpload })
  const { draggedInside, onDrop, onDragEnter, onDragLeave } = useDropZone({
    uploader: uploadFile,
  })

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return
      const file = e.target.files[0]
      if (!file) return
      uploadFile(file)
      setSelectedFile(file)
    },
    [uploadFile]
  )

  const onImageLoad = useCallback(() => {
    if (!imgRef.current) return
    const { width, height } = imgRef.current
    const widthPercent = getWidthPercent(width / height)
    setWidthPercent(widthPercent)
  }, [imgRef])

  const t = useTranslations('editor')

  if (loading) {
    return (
      <div className="rounded-lg h-[15rem] relative overflow-hidden">
        <div className="opacity-30 w-full">
          {/* eslint-disable-next-line  */}
          <img
            ref={imgRef}
            src={selectedFile ? URL.createObjectURL(selectedFile) : ''}
            className="mx-auto"
            style={{ width: `${widthPercent}%` }}
            onLoad={onImageLoad}
          />
        </div>
        <p className="absolute top-1/3 w-full text-center">{t('uploading')}</p>
      </div>
    )
  }

  const wrapperClass = cn(
    'flex flex-col items-center justify-center px-8 py-10 rounded-lg bg-opacity-80',
    draggedInside && 'bg-neutral-100'
  )

  return (
    <div className={wrapperClass} onDrop={onDrop} onDragOver={onDragEnter} onDragLeave={onDragLeave}>
      <ImageIcon className="w-12 h-12 mb-4 text-black dark:text-white opacity-20" />
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="text-sm font-medium text-center text-neutral-400 dark:text-neutral-500">
          {draggedInside ? t('putImageHere') : t('dragImageHere')}
        </div>
        <div
          className="mt-4 inline-flex items-center bg-secondary-foreground text-secondary px-2 cursor-pointer rounded"
          onClick={handleUploadClick}
        >
          <Upload className="w-4 h-4 mr-1" />
          {t('uploadImage')}
        </div>
      </div>
      <input
        className="w-0 h-0 overflow-hidden opacity-0"
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif"
        onChange={onFileChange}
      />
    </div>
  )
}
