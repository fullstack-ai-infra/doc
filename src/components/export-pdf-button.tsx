'use client'

import { useEffect, useState } from 'react'
import { FileDown, Loader } from 'lucide-react'
import debounce from 'lodash.debounce'
import { cn, loadScript } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useTranslations } from 'next-intl'
import { WORK_CONTENT_CONTAINER_ID, EVENT_SET_EDITOR_READONLY, EVENT_SET_EDITOR_EDITABLE } from '@/constants'
import emitter from '@/lib/emitter'

export default function ExportPdfButton(props: { id: string; className?: string }) {
  const { id, className = '' } = props
  const t = useTranslations('docItem')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className={cn('w-full justify-start p-2 h-8', className)}>
          <FileDown className="w-4 h-4 mr-1" />
          {t('exportPDF')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('exportPDF')}</DialogTitle>
        </DialogHeader>
        <ExportPDF />
      </DialogContent>
    </Dialog>
  )
}

// js files url
const html2canvasUrl = 'https://unpkg.com/html2canvas@latest/dist/html2canvas.min.js'
const jsPDFUrl = 'https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js'

function ExportPDF() {
  const t = useTranslations('docItem')
  const { toast } = useToast()
  const [loadingScript, setLoadingScript] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const exportFn = debounce(() => {
    const editorContainerElem = document.getElementById(WORK_CONTENT_CONTAINER_ID)
    if (editorContainerElem == null) return
    const contentElem = editorContainerElem.querySelector('div[contenteditable="true"]') as HTMLDivElement
    if (contentElem == null) return

    const paddingBottom = contentElem.style.paddingBottom
    contentElem.style.paddingBottom = '0' // remove padding-bottom

    emitter.emit(EVENT_SET_EDITOR_READONLY) // set editor readonly

    // @ts-expect-error eslint-disable-line
    const doc = new window.jspdf.jsPDF()
    doc.html(contentElem, {
      // @ts-expect-error eslint-disable-line
      callback: function (doc) {
        const fileName = `doc-${new Date().toISOString()}.pdf`
        doc.save(fileName)
        contentElem.style.paddingBottom = paddingBottom // reset padding-bottom

        emitter.emit(EVENT_SET_EDITOR_EDITABLE) // reset editor editable
      },
      x: 5,
      y: 5,
      width: 200, // target width in the PDF document
      windowWidth: 800, // window width in CSS pixels
    })
  }, 500)

  async function loadScripts() {
    try {
      await loadScript(html2canvasUrl)
      await loadScript(jsPDFUrl)

      exportFn() // export PDF automatically
      setTimeout(() => {
        setLoadingScript(false)
      }, 1000) // delay 1s for automatic export
    } catch (error) {
      console.error('loadScripts error:', error)
      toast({
        variant: 'destructive',
        description: '下载 JS 文件失败 Failed to load scripts',
      })

      setLoadingScript(false)
      setLoadError(true)
    }
  }

  useEffect(() => {
    loadScripts()
  }, []) // eslint-disable-line

  return (
    <div className="h-52">
      {loadingScript && (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="inline-flex items-center">
            <Loader className="h-5 w-5 mr-1 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      )}
      {!loadingScript && loadError && (
        <div className="flex items-center justify-center h-full text-gray-500">
          <span className="text-red-500">Error: Load JS files failed.</span>
        </div>
      )}
      {!loadingScript && !loadError && (
        <div className="flex items-center justify-center h-full">
          <Button variant="link" className="underline" onClick={exportFn}>
            {t('downloadPDF')}
          </Button>
        </div>
      )}
    </div>
  )
}
