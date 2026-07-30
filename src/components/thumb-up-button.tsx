'use client'

import { useState, useEffect, useMemo } from 'react'
import { ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { patch } from '@/lib/ajax'

export default function ThumbUpButton(props: { initialCount: number; publishId: string }) {
  const { initialCount, publishId } = props // Default count if not provided
  const STORE_KEY = useMemo(() => `thumbUp-${publishId}`, [publishId])

  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  useEffect(() => {
    // Check if the user has already liked this publishId
    const liked = localStorage.getItem(STORE_KEY)
    if (liked) {
      setIsLiked(true)
    }
    setLoading(false)
  }, [STORE_KEY])

  const [thumbUpCount, setThumbUpCount] = useState(initialCount || 0)
  const handleThumbUp = async () => {
    if (loading) return // Prevent multiple clicks
    if (isLiked) {
      if (thumbUpCount <= 0) return // Prevent decrementing below zero
      setThumbUpCount(thumbUpCount - 1)
      setIsLiked(false)
      localStorage.removeItem(STORE_KEY) // Remove publishId from localStorage
      await patchData(`/api/pub/thumb-up-decrease/${publishId}`) // Decrease thumb up count in the backend
    } else {
      setThumbUpCount(thumbUpCount + 1)
      setIsLiked(true)
      localStorage.setItem(STORE_KEY, 'true') // store publishId in localStorage
      await patchData(`/api/pub/thumb-up/${publishId}`) // Increase thumb up count in the backend
    }
  }

  async function patchData(url: string) {
    setLoading(true)
    try {
      const response = await patch(url, {})
      if (response.errno !== 0) {
        throw new Error('Network response was not ok')
      }
      const data = response.data
      return data
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center  mt-10">
      <Button
        onClick={handleThumbUp}
        variant="outline"
        size="lg"
        className={`flex items-center gap-3 p-6 text-lg font-semibold transition-all duration-200 hover:scale-105 ${
          isLiked ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100' : 'hover:bg-gray-50'
        }`}
        disabled={loading}
      >
        <ThumbsUp
          className={`w-8 h-8 transition-all duration-200 ${isLiked ? 'fill-blue-600 text-blue-600' : 'text-gray-600'}`}
        />
        <span className="tabular-nums text-xl">{thumbUpCount}</span>
      </Button>
    </div>
  )
}
