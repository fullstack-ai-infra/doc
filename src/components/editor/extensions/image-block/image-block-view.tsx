import { cn } from '@/lib/utils'
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CONTENT_WIDTH } from '@/constants'

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

  // 增加 ali-oss 图片裁剪参数
  const srcUrlObj = new URL(src)
  srcUrlObj.searchParams.set('x-oss-process', `image/resize,w_${CONTENT_WIDTH * 2},m_lfit`) // 如 w_800 表示宽度 800px，m_lfit 表示等比缩放
  const resizedSrc = srcUrlObj.href

  // 对齐方式
  const wrapperClassName = cn(
    attrs.align === 'left' ? 'ml-0' : 'ml-auto',
    attrs.align === 'right' ? 'mr-0' : 'mr-auto',
    attrs.align === 'center' && 'mx-auto',
    'bg-muted'
  )

  const onClick = useCallback(() => {
    editor.commands.setNodeSelection(getPos()) // 选中图片
  }, [getPos, editor.commands])

  const onDoubleClick = useCallback(() => {
    window.open(src, '_blank')
  }, [src])

  const [height, setHeight] = useState('auto')
  useEffect(() => {
    if (isNaN(attrs.ratio)) return
    if (!attrs.ratio) return
    let w = imgContainerRef.current!.clientWidth
    if (!w) {
      w = CONTENT_WIDTH * (parseInt(attrs.width) / 100) // 如 attrs.width 是 50%
    }
    setHeight(`${w / attrs.ratio}px`) // 根据宽高比例计算高度
  }, [setHeight, attrs.width, attrs.ratio])

  return (
    <NodeViewWrapper>
      <div ref={imgContainerRef} className={wrapperClassName} style={{ width: attrs.width, height }}>
        {/* eslint-disable-next-line  */}
        <img
          className="block"
          src={resizedSrc}
          alt=""
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          style={{ height: '100%' }}
          loading="lazy"
        />
      </div>
    </NodeViewWrapper>
  )
}

export default ImageBlockView
