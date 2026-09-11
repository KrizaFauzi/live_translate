import { useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

export interface AudioVisualizerProps {
  audioLevel: number
  isRecording: boolean
  barCount?: number
  className?: string
}

export function AudioVisualizer({
  audioLevel,
  isRecording,
  barCount = 32,
  className,
}: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(0))
  const animationRef = useRef<number>()
  const reducedMotion = useRef(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.current = mediaQuery.matches
    return () => {}
  }, [])

  useEffect(() => {
    if (!isRecording) {
      setBars(Array(barCount).fill(0))
      return
    }

    if (reducedMotion.current) {
      setBars(Array(barCount).fill(Math.max(0.1, audioLevel)))
      return
    }

    const animate = () => {
      const newBars = bars.map((_, i) => {
        const baseHeight = 4
        const maxHeight = 60
        const phase = (i / barCount) * Math.PI * 2
        const time = Date.now() / 100
        const wave = Math.sin(time + phase) * 0.5 + 0.5
        const level = Math.max(0.1, audioLevel * wave)
        return baseHeight + level * (maxHeight - baseHeight)
      })
      setBars(newBars)
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRecording, audioLevel, barCount, bars])

  return (
    <div
      className={cn('flex items-end gap-1 h-16', className)}
      aria-hidden="true"
      role="img"
      aria-label={isRecording ? 'Audio waveform visualization' : 'No audio input'}
    >
      {bars.map((height, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-[var(--accent)] transition-all duration-fast"
          style={{
            height: `${height}px`,
            opacity: isRecording ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  )
}