import { useKeyPress } from 'ahooks'
import { useState } from 'react'
import { IDoc } from '@/stores/docs-store'

interface IParams {
  list: IDoc[]
  setKeyword: React.Dispatch<React.SetStateAction<string>>
  handleClick: (doc: IDoc) => void
}

export default function useDialogListKeyPress(params: IParams) {
  const { list = [], setKeyword, handleClick } = params
  const [currentIndex, setCurrentIndex] = useState(-1)
  let nextIndex = -1
  let nextKeyword = ''

  const listLength = list.length
  const currentDoc = list[currentIndex]

  useKeyPress('uparrow', (event: KeyboardEvent) => {
    event.preventDefault()

    if (currentIndex > 0) {
      nextIndex = currentIndex - 1
      setCurrentIndex(nextIndex)
    } else {
      nextIndex = listLength - 1
      setCurrentIndex(nextIndex)
    }

    const nextDoc = list[nextIndex]
    if (!nextDoc) return
    nextKeyword = nextDoc.title
    setKeyword(nextKeyword)
  })

  useKeyPress('downarrow', (event: KeyboardEvent) => {
    event.preventDefault()

    if (currentIndex >= listLength - 1) {
      nextIndex = 0
      setCurrentIndex(nextIndex)
    } else {
      nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
    }

    const nextDoc = list[nextIndex]
    if (!nextDoc) return
    nextKeyword = nextDoc.title
    setKeyword(nextKeyword)
  })

  useKeyPress('Enter', (event: KeyboardEvent) => {
    event.preventDefault()
    if (!currentDoc) return
    handleClick(currentDoc)
  })

  return { currentIndex, setCurrentIndex }
}
