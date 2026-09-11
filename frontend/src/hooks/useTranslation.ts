import { useState, useCallback, useRef, useEffect } from 'react'
import { transcribeAudio, translateText } from '@/services/api'
import type { TranscribeResponse, TranslateRequest } from '@/types/api'

interface UseTranslationReturn {
  sourceText: string
  targetText: string
  detectedLanguage: 'id' | 'en' | null
  isTranslating: boolean
  translateError: string | null
  processAudio: (audioBlob: Blob, mode: 'id-en' | 'en-id') => Promise<void>
  reset: () => void
}

const MODES = {
  'id-en': { source: 'id', target: 'en' },
  'en-id': { source: 'en', target: 'id' },
} as const

export function useTranslation(): UseTranslationReturn {
  const [sourceText, setSourceText] = useState('')
  const [targetText, setTargetText] = useState('')
  const [detectedLanguage, setDetectedLanguage] = useState<'id' | 'en' | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setSourceText('')
    setTargetText('')
    setDetectedLanguage(null)
    setIsTranslating(false)
    setTranslateError(null)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const processAudio = useCallback(async (audioBlob: Blob, mode: 'id-en' | 'en-id') => {
    setTranslateError(null)
    setSourceText('')
    setTargetText('')
    setDetectedLanguage(null)
    setIsTranslating(true)

    abortControllerRef.current = new AbortController()

    try {
      const transcribeResult: TranscribeResponse = await transcribeAudio(audioBlob)

      if (abortControllerRef.current?.signal.aborted) return

      const { original_text, detected_language } = transcribeResult
      setSourceText(original_text)
      setDetectedLanguage(detected_language)

      const { source, target } = MODES[mode]
      setTargetText('Translating...')

      const translateRequest: TranslateRequest = {
        text: original_text,
        source_lang: source,
        target_lang: target,
      }

      const translateResult = await translateText(translateRequest)

      if (abortControllerRef.current?.signal.aborted) return

      setTargetText(translateResult.translated_text)
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return

      const errorMessage = err instanceof Error ? err.message : 'Translation failed'
      setTranslateError(errorMessage)
      setSourceText('')
      setTargetText('')
      setDetectedLanguage(null)
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsTranslating(false)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    sourceText,
    targetText,
    detectedLanguage,
    isTranslating,
    translateError,
    processAudio,
    reset,
  }
}