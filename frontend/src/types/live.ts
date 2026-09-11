export const SOURCE_LANGUAGES = [
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'en', label: 'English' },
] as const

export const TARGET_LANGUAGES = SOURCE_LANGUAGES
export type SourceLanguage = (typeof SOURCE_LANGUAGES)[number]['code']
export type TargetLanguage = (typeof TARGET_LANGUAGES)[number]['code']
export type LiveStatus = 'idle' | 'connecting' | 'listening' | 'reconnecting' | 'stopped' | 'error'

export interface LiveSourceSegment {
  id: string
  text: string
  detectedLanguage?: string
}

export interface LiveTargetSegment {
  segmentId: string
  text: string
  targetLanguage: TargetLanguage
  pending?: boolean
}

export type LiveServerEvent =
  | { type: 'session.status'; status: 'connecting' | 'listening' | 'reconnecting' | 'stopped' }
  | { type: 'transcript.partial'; text: string }
  | { type: 'transcript.final'; segmentId: string; text: string; detectedLanguage?: string }
  | { type: 'translation.pending'; segmentId: string; targetLanguage: TargetLanguage }
  | { type: 'translation.final'; segmentId: string; text: string; targetLanguage: TargetLanguage }
  | { type: 'error'; code: string; message: string; recoverable: boolean; segmentId?: string }
