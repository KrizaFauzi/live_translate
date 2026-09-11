import { useCallback, useEffect, useRef, useState } from 'react'
import type { LiveServerEvent, LiveSourceSegment, LiveStatus, LiveTargetSegment, SourceLanguage, TargetLanguage } from '@/types/live'

function websocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/live/session`
}

export function useLiveTranslation() {
  const [status, setStatus] = useState<LiveStatus>('idle')
  const [sourceSegments, setSourceSegments] = useState<LiveSourceSegment[]>([])
  const [partialText, setPartialText] = useState('')
  const [targetSegments, setTargetSegments] = useState<LiveTargetSegment[]>([])
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const activeRef = useRef(false)
  const targetRef = useRef<TargetLanguage>('en')
  const initialResolveRef = useRef<(() => void) | null>(null)
  const initialRejectRef = useRef<((reason?: unknown) => void) | null>(null)

  const reset = useCallback(() => {
    setSourceSegments([])
    setPartialText('')
    setTargetSegments([])
    setError(null)
  }, [])

  const finishStart = useCallback((reason?: unknown) => {
    if (reason) initialRejectRef.current?.(reason)
    else initialResolveRef.current?.()
    initialResolveRef.current = null
    initialRejectRef.current = null
  }, [])

  const stop = useCallback(() => {
    activeRef.current = false
    const socket = socketRef.current
    socketRef.current = null
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'stop' }))
    socket?.close(1000)
    setPartialText('')
    setStatus('stopped')
  }, [])

  const handleMessage = useCallback((event: MessageEvent<string>) => {
    let payload: LiveServerEvent
    try {
      payload = JSON.parse(event.data) as LiveServerEvent
    } catch {
      return
    }

    switch (payload.type) {
      case 'session.status':
        setStatus(payload.status)
        if (payload.status === 'listening') finishStart()
        return
      case 'transcript.partial':
        setPartialText(payload.text)
        return
      case 'transcript.final':
        setPartialText('')
        setSourceSegments((segments) => [...segments, {
          id: payload.segmentId,
          text: payload.text,
          detectedLanguage: payload.detectedLanguage,
        }])
        return
      case 'translation.pending':
        setTargetSegments((segments) => [...segments, { segmentId: payload.segmentId, text: '', targetLanguage: payload.targetLanguage, pending: true }])
        return
      case 'translation.final':
        setTargetSegments((segments) => segments.map((segment) => segment.segmentId === payload.segmentId ? { ...segment, text: payload.text, pending: false } : segment))
        return
      case 'error': {
        const message = payload.message || 'Live transcription encountered an error.'
        setError(message)
        if (initialRejectRef.current) {
          activeRef.current = false
          setStatus('error')
          finishStart(new Error(message))
        }
      }
    }
  }, [finishStart])

  const start = useCallback((sourceLanguage: SourceLanguage, targetLanguage: TargetLanguage) => {
    stop()
    activeRef.current = true
    targetRef.current = targetLanguage
    reset()
    setStatus('connecting')

    return new Promise<void>((resolve, reject) => {
      initialResolveRef.current = resolve
      initialRejectRef.current = reject
      const socket = new WebSocket(websocketUrl())
      socket.binaryType = 'arraybuffer'
      socketRef.current = socket
      socket.onopen = () => {
        if (activeRef.current) socket.send(JSON.stringify({ type: 'start', sourceLanguage, targetLanguage }))
      }
      socket.onmessage = handleMessage
      socket.onerror = () => {
        if (initialRejectRef.current) finishStart(new Error('Could not connect to the live transcription server.'))
      }
      socket.onclose = () => {
        if (socketRef.current !== socket) return
        socketRef.current = null
        if (!activeRef.current) return
        activeRef.current = false
        setStatus('error')
        setError('Live connection was closed. Please start a new session.')
        finishStart(new Error('Live connection was closed.'))
      }
    })
  }, [finishStart, handleMessage, reset, stop])

  const sendAudioFrame = useCallback((frame: ArrayBuffer) => {
    if (socketRef.current?.readyState === WebSocket.OPEN && activeRef.current) socketRef.current.send(frame)
  }, [])

  const changeTargetLanguage = useCallback((targetLanguage: TargetLanguage) => {
    targetRef.current = targetLanguage
    if (socketRef.current?.readyState === WebSocket.OPEN && activeRef.current) socketRef.current.send(JSON.stringify({ type: 'target_language.changed', targetLanguage }))
  }, [])

  useEffect(() => () => stop(), [stop])

  return { status, sourceSegments, partialText, targetSegments, error, start, stop, reset, sendAudioFrame, changeTargetLanguage }
}
