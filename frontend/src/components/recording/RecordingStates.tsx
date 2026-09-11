import { Microphone, Spinner, CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { cn } from '@/utils/cn'
import type { RecordingState } from '@/types/recording'

export interface RecordingStatesProps {
  state: RecordingState
  error?: string | null
  className?: string
}

export function RecordingStates({ state, error, className }: RecordingStatesProps) {
  const states = {
    idle: (
      <div className={cn('flex flex-col items-center gap-3 text-[var(--fg-muted)] py-8', className)}>
        <Microphone className="w-12 h-12 opacity-50" aria-hidden="true" />
        <p className="text-center text-body-sm">Press and hold the microphone button to start recording</p>
      </div>
    ),
    recording: (
      <div className={cn('flex items-center gap-3 text-[var(--destructive)] animate-pulse', className)}>
        <Microphone className="w-6 h-6" aria-hidden="true" />
        <span className="font-medium text-body">Listening... Speak now</span>
      </div>
    ),
    processing: (
      <div className={cn('flex flex-col items-center gap-4 text-[var(--fg-secondary)]', className)}>
        <div className="flex items-center gap-3">
          <Spinner className="w-6 h-6 animate-spin" aria-hidden="true" />
          <span className="font-medium text-body">Transcribing audio...</span>
        </div>
      </div>
    ),
    success: (
      <div className={cn('flex items-center gap-2 text-[var(--accent)] animate-scale-in', className)}>
        <CheckCircle className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
        <span className="font-medium text-body">Translation complete</span>
      </div>
    ),
    error: (
      <div className={cn('flex items-center gap-2 text-[var(--destructive)]', className)} role="alert">
        <WarningCircle className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
        <p className="text-body-sm">{error || 'An error occurred. Please try again.'}</p>
      </div>
    ),
  }

  return <div className="w-full">{states[state]}</div>
}