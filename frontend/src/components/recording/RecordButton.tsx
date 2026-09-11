import { useRef, useEffect, useCallback } from 'react'
import { Microphone, MicrophoneSlash, Spinner, CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { Button } from '../ui/Button'
import { cn } from '@/utils/cn'
import type { RecordingState } from '@/types/recording'

export interface RecordButtonProps {
  state: RecordingState
  onStart: () => void
  onStop: () => void
  disabled?: boolean
  onKeyDown?: (e: React.KeyboardEvent) => void
  onKeyUp?: (e: React.KeyboardEvent) => void
}

const stateIcons = {
  idle: <Microphone className="w-8 h-8" aria-hidden="true" />,
  recording: <MicrophoneSlash className="w-8 h-8" aria-hidden="true" />,
  processing: <Spinner className="w-8 h-8 animate-spin" aria-hidden="true" />,
  success: <CheckCircle className="w-8 h-8" aria-hidden="true" />,
  error: <WarningCircle className="w-8 h-8" aria-hidden="true" />,
}

const stateLabels = {
  idle: 'Press and hold to record (or press Space)',
  recording: 'Release to stop recording',
  processing: 'Processing audio, please wait',
  success: 'Translation complete. Press to record again',
  error: 'Error occurred. Press to try again',
}

const stateAriaPressed = {
  idle: false,
  recording: true,
  processing: false,
  success: false,
  error: false,
}

const stateAriaBusy = {
  idle: false,
  recording: false,
  processing: true,
  success: false,
  error: false,
}

export function RecordButton({
  state,
  onStart,
  onStop,
  disabled,
  onKeyDown,
  onKeyUp,
}: RecordButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isSpacePressed = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (state === 'idle' || state === 'success' || state === 'error') {
      e.preventDefault()
      onStart()
    }
  }, [state, onStart])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (state === 'recording') {
      e.preventDefault()
      onStop()
    }
  }, [state, onStop])

  const handleMouseLeave = useCallback((_: React.MouseEvent) => {
    if (state === 'recording') {
      onStop()
    }
  }, [state, onStop])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (state === 'idle' || state === 'success' || state === 'error') {
      e.preventDefault()
      onStart()
    }
  }, [state, onStart])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (state === 'recording') {
      e.preventDefault()
      onStop()
    }
  }, [state, onStop])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.code === 'Space' && !isSpacePressed.current && !e.repeat) {
      if (state === 'idle' || state === 'success' || state === 'error') {
        e.preventDefault()
        isSpacePressed.current = true
        onStart()
      }
    }
    onKeyDown?.(e)
  }, [state, onStart, onKeyDown])

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.code === 'Space' && isSpacePressed.current) {
      if (state === 'recording') {
        e.preventDefault()
        onStop()
      }
      isSpacePressed.current = false
    }
    onKeyUp?.(e)
  }, [state, onStop, onKeyUp])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed.current && !e.repeat) {
        if (state === 'idle' || state === 'success' || state === 'error') {
          if (buttonRef.current && document.activeElement === buttonRef.current) {
            e.preventDefault()
            isSpacePressed.current = true
            onStart()
          }
        }
      }
    }

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpacePressed.current) {
        if (state === 'recording') {
          e.preventDefault()
          onStop()
        }
        isSpacePressed.current = false
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    window.addEventListener('keyup', handleGlobalKeyUp)

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      window.removeEventListener('keyup', handleGlobalKeyUp)
    }
  }, [state, onStart, onStop])

  const baseClasses = 'relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-base focus-ring'

  const stateClasses = {
    idle: 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent)]/90',
    recording: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] animate-recording-pulse',
    processing: 'bg-[var(--muted)] text-[var(--fg-muted)] cursor-wait',
    success: 'bg-[var(--accent)] text-[var(--accent-foreground)]',
    error: 'bg-[var(--destructive)] text-[var(--destructive-foreground)]',
  }

  return (
    <Button
      ref={buttonRef}
      type="button"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      disabled={disabled || state === 'processing'}
      aria-label={stateLabels[state]}
      aria-pressed={stateAriaPressed[state]}
      aria-busy={stateAriaBusy[state]}
      className={cn(baseClasses, stateClasses[state])}
    >
      {stateIcons[state]}
      <span className="sr-only">{stateLabels[state]}</span>

      {state === 'recording' && (
        <div className="absolute -inset-2 rounded-full border-2 border-[var(--destructive)]/30 animate-recording-pulse" aria-hidden="true" />
      )}
    </Button>
  )
}