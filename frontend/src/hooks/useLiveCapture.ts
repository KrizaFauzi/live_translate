import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseLiveCaptureReturn {
  isCapturing: boolean
  audioLevel: number
  elapsedSeconds: number
  error: string | null
  start: () => Promise<void>
  stop: () => void
}

export function useLiveCapture(onAudioFrame: (frame: ArrayBuffer) => void): UseLiveCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const callbackRef = useRef(onAudioFrame)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startedAtRef = useRef<number | null>(null)

  useEffect(() => {
    callbackRef.current = onAudioFrame
  }, [onAudioFrame])

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
    timerRef.current = null
    animationFrameRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (contextRef.current && contextRef.current.state !== 'closed') void contextRef.current.close()
    contextRef.current = null
    startedAtRef.current = null
    setIsCapturing(false)
    setAudioLevel(0)
  }, [])

  const stop = useCallback(() => cleanup(), [cleanup])

  const start = useCallback(async () => {
    cleanup()
    setError(null)
    setElapsedSeconds(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      const webkitWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext }
      const AudioContextConstructor = window.AudioContext || webkitWindow.webkitAudioContext
      if (!AudioContextConstructor || !window.AudioWorkletNode) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error('Your browser does not support live audio capture. Use a recent version of Chrome or Edge.')
      }

      const context = new AudioContextConstructor()
      await context.audioWorklet.addModule(new URL('../audio/pcm-worklet.js', import.meta.url))
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      const processor = new AudioWorkletNode(context, 'pcm16-processor')
      const silentOutput = context.createGain()
      silentOutput.gain.value = 0

      processor.port.onmessage = (event: MessageEvent<ArrayBuffer>) => callbackRef.current(event.data)
      source.connect(analyser)
      source.connect(processor)
      processor.connect(silentOutput)
      silentOutput.connect(context.destination)

      const updateLevel = () => {
        const levels = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(levels)
        const average = levels.reduce((sum, value) => sum + value, 0) / levels.length
        setAudioLevel(Math.min(average / 128, 1))
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }

      streamRef.current = stream
      contextRef.current = context
      startedAtRef.current = Date.now()
      setIsCapturing(true)
      timerRef.current = window.setInterval(() => {
        if (startedAtRef.current) setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 250)
      updateLevel()
    } catch (captureError) {
      const message = captureError instanceof Error && captureError.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow microphone access and try again.'
        : captureError instanceof Error ? captureError.message : 'Could not start live microphone capture.'
      setError(message)
      cleanup()
      throw new Error(message)
    }
  }, [cleanup])

  useEffect(() => cleanup, [cleanup])

  return { isCapturing, audioLevel, elapsedSeconds, error, start, stop }
}
