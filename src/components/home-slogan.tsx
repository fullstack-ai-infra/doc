'use client'

import Typed from 'typed.js'
import { useEffect, useRef } from 'react'

export default function Slogan({ text }: { text: string }) {
  const el = useRef(null)

  useEffect(() => {
    const typed = new Typed(el.current, {
      strings: [text],
      startDelay: 300,
      typeSpeed: 100,
      backSpeed: 100,
      backDelay: 100,
      cursorChar: ' _',
    })

    return () => {
      typed.destroy()
    }
  }, [text])

  return (
    <p role="slogan" className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
      <span ref={el}>&nbsp;</span>
    </p>
  )
}
