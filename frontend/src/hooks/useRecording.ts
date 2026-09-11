import { useState, useRef, useCallback, useEffect } from 'react'
import { RECORDING_CONFIG } from '@/types/recording'
import type { RecordingState, UseRecordingReturn, RecordingConfig } from '@/types/recording'

export function useRecording(config: RecordingConfig = RECORDING_CONFIG): UseRecordingReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()
  const recordingStartRef = useRef<number>()
  const durationIntervalRef = useRef<number>()
  const streamRef = useRef<MediaStream | null>(null)

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    const sum = dataArray.reduce((acc, val) => acc + val, 0)
    const average = sum / dataArray.length
    const normalized = Math.min(average / 128, 1)

    setAudioLevel(normalized)

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }, [])

  const startDurationTimer = useCallback(() => {
    recordingStartRef.current = Date.now()
    durationIntervalRef.current = window.setInterval(() => {
      if (recordingStartRef.current) {
        setRecordingDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000))
      }
    }, 100)
  }, [])

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
    }
  }, [])

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    stopDurationTimer()
  }, [stopDurationTimer])

  const startRecording = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    setAudioLevel(0)
    setRecordingDuration(0)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyserRef.current = analyser

      const mediaRecorder = new MediaRecorder(stream, { mimeType: config.mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: config.mimeType })
        setAudioBlob(blob)
      }

      mediaRecorder.start(config.chunkInterval)
      setState('recording')
      startDurationTimer()
      updateAudioLevel()
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access in your browser settings.'
          : 'Failed to access microphone. Please check your device settings.'
        : 'An unknown error occurred'

      setError(errorMessage)
      setState('error')
      cleanup()
    }
  }, [config.mimeType, config.chunkInterval, startDurationTimer, updateAudioLevel, cleanup])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    cleanup()
  }, [cleanup])

  const reset = useCallback(() => {
    setState('idle')
    setAudioBlob(null)
    setAudioLevel(0)
    setRecordingDuration(0)
    setError(null)
    audioChunksRef.current = []
    cleanup()
  }, [cleanup])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    state,
    startRecording,
    stopRecording,
    audioBlob,
    audioLevel,
    recordingDuration,
    error,
    reset,
  }
}