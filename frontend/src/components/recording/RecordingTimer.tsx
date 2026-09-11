import { cn } from '@/utils/cn'

export interface RecordingTimerProps {
  duration: number
  isRecording: boolean
  className?: string
}

export function RecordingTimer({ duration, isRecording, className }: RecordingTimerProps) {
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-sm font-medium tabular-nums',
        isRecording ? 'text-[var(--destructive)]' : 'text-[var(--fg-muted)]',
        className
      )}
      aria-live={isRecording ? 'polite' : 'off'}
      aria-label={isRecording ? `Recording duration: ${formatted}` : ''}
    >
      {isRecording && (
        <span className="w-2 h-2 rounded-full bg-[var(--destructive)] animate-pulse" aria-hidden="true" />
      )}
      <span>{formatted}</span>
    </div>
  )
}