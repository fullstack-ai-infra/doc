'use client'

import { Button } from '@/components/ui/button'
import { ArrowUpFromLine } from 'lucide-react'
import scrollIntoView from 'scroll-into-view-if-needed'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import debounce from 'lodash.debounce'
import { useEffect, useState } from 'react'
import { WORK_CONTENT_SCROLL_CONTAINER, WORK_CONTENT_CONTAINER_ID } from '@/constants'

export default function BackToTop() {
  const [shouldShowBackToTop, setShouldShowBackToTop] = useState(false)

  // 检查滚动条状态，判断是否展示”返回顶部“按钮。
  const checkScrollBar = debounce(() => {
    const element = document.getElementById(WORK_CONTENT_SCROLL_CONTAINER)
    if (element) {
      const hasVerticalScrollbar = element.scrollTop > 0
      setShouldShowBackToTop(hasVerticalScrollbar)
    }
  }, 200)

  useEffect(() => {
    // 由于滚动条的捕获元素为WORK_CONTENT_SCROLL_CONTAINER，所以在此处捕获其滚动事件
    const element = document.getElementById(WORK_CONTENT_SCROLL_CONTAINER)
    if (element) {
      element.addEventListener('scroll', checkScrollBar)
    }
    return () => {
      if (element) {
        element.removeEventListener('scroll', checkScrollBar)
      }
    }
  }, [checkScrollBar])

  const scrollToTop = () => {
    const container = document.getElementById(WORK_CONTENT_CONTAINER_ID)
    if (!container) return
    scrollIntoView(container, {
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <>
      {shouldShowBackToTop && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={scrollToTop} size="icon" className="rounded-full">
                <ArrowUpFromLine className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent align="center">
              <p>Back to top</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  )
}
