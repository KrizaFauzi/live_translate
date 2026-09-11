import { Copy } from '@phosphor-icons/react'
import { Button } from '../ui/Button'
import { Tooltip } from '../ui/Tooltip'
import { cn } from '@/utils/cn'
import type { RecordingState } from '@/types/recording'
import { SOURCE_LANGUAGES, type LiveSourceSegment, type SourceLanguage } from '@/types/live'

export interface SourcePanelProps {
  sourceText: string
  detectedLanguage: string | null
  recordingState?: RecordingState
  isProcessing?: boolean
  onCopy: () => void
  liveSegments?: LiveSourceSegment[]
  partialText?: string
  isLive?: boolean
  sourceLanguage?: SourceLanguage
  className?: string
}

const languageLabel = (language: string | null) => language ? language.replace('-', ' ').toUpperCase() : 'UNKNOWN'

export function SourcePanel({
  sourceText,
  detectedLanguage,
  recordingState = 'idle',
  isProcessing = false,
  onCopy,
  liveSegments,
  partialText = '',
  isLive = false,
  sourceLanguage,
  className,
}: SourcePanelProps) {
  const isRecording = recordingState === 'recording'
  const isTranscribing = recordingState === 'processing' && sourceText === ''
  const hasLiveContent = (liveSegments?.length ?? 0) > 0 || Boolean(partialText)

  return (
    <section className={cn('card p-6 min-h-[280px] flex flex-col', className)} aria-labelledby="source-heading">
      <header className="flex items-center justify-between mb-4">
        <h2 id="source-heading" className="label text-[var(--fg-muted)]">
          {isLive ? `SOURCE · ${SOURCE_LANGUAGES.find((language) => language.code === sourceLanguage)?.label ?? 'SELECT LANGUAGE'}` : languageLabel(detectedLanguage)}
          {detectedLanguage && !isLive && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-[var(--accent-subtle)] text-[var(--accent)] rounded-full font-medium">
              Detected: {languageLabel(detectedLanguage)}
            </span>
          )}
        </h2>
        <Tooltip content="Copy source text" position="left">
          <Button variant="ghost" size="sm" onClick={onCopy} disabled={!sourceText || isProcessing} aria-label="Copy source text">
            <Copy className="w-4 h-4" aria-hidden="true" />
          </Button>
        </Tooltip>
      </header>
      <div className="flex-1 overflow-y-auto space-y-3">
        {isLive ? (
          <>
            {liveSegments?.map((segment) => <p key={segment.id} className="text-body leading-relaxed whitespace-pre-wrap">{segment.text}</p>)}
            {partialText && <p className="text-body leading-relaxed whitespace-pre-wrap text-[var(--fg-muted)] italic" aria-live="polite">{partialText}</p>}
            {!hasLiveContent && <p className="text-[var(--fg-muted)] text-center py-8">Choose a source language, then start listening</p>}
          </>
        ) : (
          <>
            {isRecording && <p className="text-sm font-medium text-[var(--accent)] animate-pulse" role="status">Listening... Speak now</p>}
            {isTranscribing && <p className="text-sm text-[var(--fg-muted)]" role="status">Transcribing audio...</p>}
            {sourceText && !isRecording && !isTranscribing && <p className="text-body leading-relaxed whitespace-pre-wrap">{sourceText}</p>}
            {!sourceText && recordingState === 'idle' && <p className="text-[var(--fg-muted)] text-center py-8">Press and hold the microphone button to start recording</p>}
          </>
        )}
      </div>
    </section>
  )
}
