import { useCallback, useState } from 'react'
import { MainLayout, PanelGrid } from '@/components/layout'
import { SourceLanguageSelect, SourcePanel, TargetLanguageSelect, TargetPanel } from '@/components/translation'
import { AudioVisualizer, RecordingTimer } from '@/components/recording'
import { Button } from '@/components/ui/Button'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { useLiveCapture } from '@/hooks/useLiveCapture'
import { useLiveTranslation } from '@/hooks/useLiveTranslation'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import type { SourceLanguage, TargetLanguage } from '@/types/live'

function AppContent() {
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>('id')
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('en')
  const { showToast } = useToast()
  const live = useLiveTranslation()
  const liveCapture = useLiveCapture(live.sendAudioFrame)

  const sourceText = live.sourceSegments.map((segment) => segment.text).join('\n')
  const targetText = live.targetSegments.filter((segment) => !segment.pending).map((segment) => segment.text).join('\n')
  const detectedLanguage = live.sourceSegments[live.sourceSegments.length - 1]?.detectedLanguage ?? null
  const isBusy = live.status === 'connecting' || live.status === 'reconnecting'

  const handleStart = useCallback(async () => {
    const accepted = window.localStorage.getItem('live-mode-disclosure-accepted') === 'true'
    if (!accepted) {
      const confirmed = window.confirm('Live Mode transcribes audio locally with whisper.cpp and translates finalized text locally with LibreTranslate. Continue?')
      if (!confirmed) return
      window.localStorage.setItem('live-mode-disclosure-accepted', 'true')
    }
    try {
      await live.start(sourceLanguage, targetLanguage)
      await liveCapture.start()
    } catch (startError) {
      showToast(startError instanceof Error ? startError.message : 'Could not start Live Mode.', 'error')
      live.stop()
    }
  }, [live, liveCapture, showToast, sourceLanguage, targetLanguage])

  const handleTargetLanguageChange = useCallback((language: TargetLanguage) => {
    setTargetLanguage(language)
    live.changeTargetLanguage(language)
  }, [live])

  const handleStop = useCallback(() => {
    liveCapture.stop()
    live.stop()
  }, [live, liveCapture])

  const copy = useCallback((text: string, label: string) => {
    if (!text) return
    void navigator.clipboard.writeText(text)
    showToast(`${label} copied`, 'success')
  }, [showToast])

  useKeyboardShortcuts({
    onRecord: handleStart,
    onStopRecord: handleStop,
    onCopySource: () => copy(sourceText, 'Source text'),
    onCopyTarget: () => copy(targetText, 'Translation'),
    enabled: !isBusy,
  })

  return (
    <MainLayout>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <SourceLanguageSelect value={sourceLanguage} onChange={setSourceLanguage} disabled={live.status === 'listening'} />
        <TargetLanguageSelect value={targetLanguage} onChange={handleTargetLanguageChange} />
      </div>

      <PanelGrid>
        <SourcePanel
          sourceText={sourceText}
          detectedLanguage={detectedLanguage}
          isProcessing={isBusy}
          onCopy={() => copy(sourceText, 'Source text')}
          liveSegments={live.sourceSegments}
          partialText={live.partialText}
          isLive
          sourceLanguage={sourceLanguage}
        />
        <TargetPanel segments={live.targetSegments} targetLanguage={targetLanguage} onCopy={() => copy(targetText, 'Translation')} />
      </PanelGrid>

      <div className="flex flex-col items-center gap-4">
        <AudioVisualizer audioLevel={liveCapture.audioLevel} isRecording={liveCapture.isCapturing} />
        <RecordingTimer duration={liveCapture.elapsedSeconds} isRecording={liveCapture.isCapturing} />
        <Button variant={live.status === 'listening' ? 'destructive' : 'primary'} size="lg" onClick={live.status === 'listening' ? handleStop : handleStart} disabled={isBusy}>
          {live.status === 'listening' ? 'Stop listening' : isBusy ? 'Connecting...' : 'Start listening'}
        </Button>
        <p className="text-sm text-[var(--fg-muted)]" aria-live="polite">
          {live.error || liveCapture.error || (live.status === 'listening' ? 'Listening and translating live' : 'Choose the language you will speak, then start listening')}
        </p>
        <p className="text-caption text-[var(--fg-muted)] text-center max-w-md">whisper.cpp transcribes audio locally; LibreTranslate runs locally in Docker for text translation.</p>
      </div>
    </MainLayout>
  )
}

export default function App() {
  return <ThemeProvider defaultTheme="system"><ToastProvider><AppContent /></ToastProvider></ThemeProvider>
}
