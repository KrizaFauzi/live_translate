import type { TranscribeResponse, TranslateRequest, TranslateResponse, HealthResponse } from '@/types/api'

const API_BASE = '/api'

class ApiClientError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail)
    this.name = 'ApiClientError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = 'An error occurred'
    try {
      const errorData: { detail: string } = await response.json()
      detail = errorData.detail
    } catch {
      detail = response.statusText
    }
    throw new ApiClientError(response.status, detail)
  }
  return response.json()
}

export async function transcribeAudio(audioBlob: Blob): Promise<TranscribeResponse> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')

  const response = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    body: formData,
  })

  return handleResponse<TranscribeResponse>(response)
}

export async function translateText(request: TranslateRequest): Promise<TranslateResponse> {
  const response = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  return handleResponse<TranslateResponse>(response)
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`)
  return handleResponse<HealthResponse>(response)
}