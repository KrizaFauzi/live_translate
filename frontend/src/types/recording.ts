export type RecordingState = 'idle' | 'recording' | 'processing' | 'success' | 'error'

export interface AudioChunk {
  data: Blob
  timestamp: number
}

export interface RecordingConfig {
  mimeType: string
  audioBitsPerSecond?: number
  chunkInterval: number
  maxDuration: number
}

export interface UseRecordingReturn {
  state: RecordingState
  startRecording: () => Promise<void>
  stopRecording: () => void
  audioBlob: Blob | null
  audioLevel: number
  recordingDuration: number
  error: string | null
  reset: () => void
}

export const RECORDING_CONFIG: RecordingConfig = {
  mimeType: 'audio/webm;codecs=opus',
  chunkInterval: 100,
  maxDuration: 60000,
}