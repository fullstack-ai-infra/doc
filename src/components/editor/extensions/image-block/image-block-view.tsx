import { cn } from '@/lib/utils'
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CONTENT_WIDTH } from '@/constants'
import { safeImageAlignment, safeImageRatio, safeImageSource, safeImageWidth } from '@/lib/tiptap-attribute-safety'

interface ImageBlockAttrs {
  src: string
  ratio: number
  width: string
  align: 'left' | 'center' | 'right'
}

export const ImageBlockView = (props: ReactNodeViewProps) => {
  const { editor, getPos, node } = props
  const attrs = node.attrs as ImageBlockAttrs
  const { src } = attrs
  const imgContainerRef = useRef<HTMLDivElement>(null)
  const safeSrc = safeImageSource(src)
  const safeWidth = safeImageWidth(attrs.width) || '100%'
  const safeRatio = safeImageRatio(attrs.ratio)
  const safeAlign = safeImageAlignment(attrs.align) || 'center'

  // 增加 ali-oss 图片裁剪参数
  let resizedSrc: string | null = null
  if (safeSrc) {
    const srcUrlObj = new URL(safeSrc)
    srcUrlObj.searchParams.set('x-oss-process', `image/resize,w_${CONTENT_WIDTH * 2},m_lfit`) // 如 w_800 表示宽度 800px，m_lfit 表示等比缩放
    resizedSrc = srcUrlObj.href
  }

  // 对齐方式
  const wrapperClassName = cn(
    safeAlign === 'left' ? 'ml-0' : 'ml-auto',
    safeAlign === 'right' ? 'mr-0' : 'mr-auto',
    safeAlign === 'center' && 'mx-auto',
    'bg-muted'
  )

  const onClick = useCallback(() => {
    editor.commands.setNodeSelection(getPos()) // 选中图片
  }, [getPos, editor.commands])

  const onDoubleClick = useCallback(() => {
    if (safeSrc) window.open(safeSrc, '_blank', 'noopener,noreferrer')
  }, [safeSrc])

  const [height, setHeight] = useState('auto')
  useEffect(() => {
    if (safeRatio == null) {
      setHeight('auto')
      return
    }
    let w = imgContainerRef.current!.clientWidth
    if (!w) {
      w = CONTENT_WIDTH * (parseFloat(safeWidth) / 100) // 如 attrs.width 是 50%
    }
    setHeight(`${w / safeRatio}px`) // 根据宽高比例计算高度
  }, [setHeight, safeWidth, safeRatio])

  return (
    <NodeViewWrapper>
      <div ref={imgContainerRef} className={wrapperClassName} style={{ width: safeWidth, height }}>
        {resizedSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="block"
            src={resizedSrc}
            alt=""
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            style={{ height: '100%' }}
            loading="lazy"
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}

export default ImageBlockView
