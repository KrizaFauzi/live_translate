export interface TranscribeResponse {
  original_text: string
  detected_language: 'id' | 'en'
}

export interface TranslateRequest {
  text: string
  source_lang: 'id' | 'en'
  target_lang: 'id' | 'en'
}

export interface TranslateResponse {
  translated_text: string
}

export interface HealthResponse {
  status: 'ok'
}

export interface ApiError {
  detail: string
}