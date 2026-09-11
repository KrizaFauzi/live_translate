# Live Speech-to-Text Translation Plan

> **Architecture update (2026-09-11):** The implementation is cloud-first. The browser streams PCM directly to Gemini Live with a constrained ephemeral token. The backend no longer relays audio or packages local STT/translation models; it only issues the short-lived token and translates finalized text with the permanent server-side key.

## Decision summary

Use a cloud-powered live speech-to-text translation flow. The browser continuously captures microphone audio, automatically detects the spoken language, renders a live source transcript, and translates each final speech segment into the language selected in a dropdown.

### Chosen MVP stack

- **Streaming STT:** Gemini `gemini-3.5-transcribe-live`.
- **Language detection:** automatic; send no source-language hints by default.
- **Text translation:** Gemini `gemini-3.5-flash-lite`, called only after an STT segment is final.
- **Realtime transport:** browser to FastAPI over a same-origin WebSocket; FastAPI holds the Gemini API key and relays audio/events.
- **Browser audio:** `AudioWorklet` emits mono, signed PCM16 at 16 kHz in 100 ms frames.

This choice directly supports auto-detection, partial and final transcript events, Indonesian (`id-ID`), language switching, and custom vocabulary. It also avoids generating translated audio that this feature does not need. Gemini's Live Transcribe documentation currently limits a streaming session to ten minutes, so MVP explicitly presents this boundary rather than hiding it. [Live Transcribe](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe) · [pricing](https://ai.google.dev/gemini-api/docs/pricing)

## Problem

The current product only processes audio after the user stops recording:

`record blob -> POST /api/transcribe -> POST /api/translate -> render text`

That makes the feature feel like an audio-file translator. It does not meet the desired live use case: listen while someone is speaking, identify their language automatically, and show the translation in a target language selected by the user.

## Product goal

For a clear microphone input, users can start one Live Mode session and read source captions and target-language translation with no manual source-language selection.

### Success measures

- Partial source text begins appearing within 1.5 seconds of speech under a normal connection.
- A finalized source segment is translated and shown within 2 seconds of the provider finalizing it.
- The detected language is displayed for final segments when supplied by the provider.
- Users can choose the target language before a session starts and change it for subsequent final segments while it is live.
- Private Mode continues to work without a `GEMINI_API_KEY`.
- No API key is present in frontend assets, browser storage, or WebSocket messages.

## User experience

### Main live flow

1. User selects **Live Mode**.
2. The screen clearly explains that Live Mode streams microphone audio to Gemini, then asks for microphone permission.
3. User chooses a target language from a dropdown; source is fixed to `Auto-detect`.
4. User selects **Start listening**.
5. A source panel displays a mutable, muted partial transcript while speech is active.
6. After a speech pause, the source segment becomes final and is appended to the transcript. The detected language chip updates if available.
7. The matching target segment appears in the target panel after translation. Source and target use the same `segmentId`, allowing their order to remain aligned.
8. User selects **Stop**; the socket closes cleanly, microphone tracks are stopped, and the final received text remains copyable.

### Important interaction rules

- Translate **final STT segments only**. Partial translations would visibly rewrite too often and make the target panel difficult to read.
- The target dropdown remains editable while live. A change applies only to newly finalized segments; previously translated text is not rewritten.
- Default target options: Indonesian, English, Japanese, Korean, Simplified Chinese, Spanish, French, and Javanese. Keep supported language metadata in one shared mapping so UI options and backend validation cannot drift.
- Show `Listening`, `Connecting`, `Reconnecting`, `Translating`, `Stopped`, and `Error` as distinct states.
- At 9 minutes 30 seconds, show a visible notice that the current live session will end shortly. MVP asks the user to start a new session; transparent session handoff is deferred.

## Architecture

```text
Browser microphone
  -> AudioWorklet: PCM16 16 kHz frames (100 ms)
  -> WebSocket /api/live/session
  -> FastAPI live-session relay
  -> Gemini Live Transcribe (automatic source-language detection)
  -> partial/final transcript events
  -> FastAPI translation service for final segments only
  -> transcript/translation events to browser
  -> Source and Target panels
```

The browser never receives `GEMINI_API_KEY`. The FastAPI process opens the provider session and performs text translation server-side.

### WebSocket contract

Client sends binary PCM frames after `start` and JSON control messages:

```ts
type ClientEvent =
  | { type: 'start'; targetLanguage: TargetLanguage }
  | { type: 'target_language.changed'; targetLanguage: TargetLanguage }
  | { type: 'stop' }
```

Server sends JSON events:

```ts
type ServerEvent =
  | { type: 'session.status'; status: 'connecting' | 'listening' | 'reconnecting' | 'stopped' }
  | { type: 'transcript.partial'; text: string }
  | { type: 'transcript.final'; segmentId: string; text: string; detectedLanguage?: string }
  | { type: 'translation.pending'; segmentId: string; targetLanguage: string }
  | { type: 'translation.final'; segmentId: string; text: string; targetLanguage: string }
  | { type: 'session.warning'; code: 'session_ending'; message: string }
  | { type: 'error'; code: string; message: string; recoverable: boolean }
```

Binary audio is accepted only after a valid `start` event, at a fixed maximum frame size. Reject text masquerading as audio, oversized frames, unsupported target languages, and a second active session from the same browser connection.

## Scope

### Included

- Live Mode and Private Mode selector.
- Automatic source-language detection in Live Mode.
- Live source partials, finalized source segments, and target-language translation segments.
- Target-language dropdown and supported-language configuration.
- Microphone visualization, elapsed timer, status and reconnect/error feedback.
- Secure provider-key handling, environment configuration, basic rate and duration safeguards.
- Unit, component, WebSocket integration, and browser end-to-end tests using mocked provider responses.

### Excluded from MVP

- Generated translated voice, call/meeting integration, or speaker-to-speaker routing.
- Speaker diarization, word-level timestamps, saved transcript history, and user accounts.
- Seamless continuation past the ten-minute provider session boundary.
- Offline streaming replacement for faster-whisper.
- Translation glossary/editor and retranslation of previous segments after a target-language change.

## Implementation plan

### Phase 0 — Product contract and safety

**Files:** `PRD.md`, `.env.example` (new), `.gitignore`, `frontend/src/App.tsx`

1. Update the PRD to describe two explicitly different privacy modes. Remove the unconditional UI statement that all processing is local.
2. Add `GEMINI_API_KEY` to `.env.example` with no value and ensure `.env` remains ignored.
3. Add a first-use Live Mode disclosure: microphone audio is sent to Gemini while listening is active. Require an acknowledgement before requesting microphone access.
4. Define the target-language list and BCP-47 codes in one shared frontend configuration. The backend keeps its own validated equivalent because it cannot import browser code.

**Acceptance:** the product does not claim cloud processing is local; a missing API key disables Live Mode with a useful message while Private Mode remains usable.

### Phase 1 — Backend live-session foundation

**Files:** `backend/main.py`, `backend/models/live.py` (new), `backend/services/live_transcription.py` (new), `backend/services/live_translation.py` (new), `backend/requirements.txt`, `backend/tests/test_live_models.py` (new), `backend/tests/test_live_websocket.py` (new)

1. Add `google-genai` and an environment/settings dependency. Read the API key only in backend startup/session creation.
2. Define Pydantic models for target-language validation and server/client control events.
3. Create a `LiveTranscriptionSession` abstraction with injectable provider client. It must:
   - open Gemini Live Transcribe with automatic language detection;
   - send raw PCM16 frames;
   - normalize provider partial/final events into the WebSocket contract;
   - close on stop, disconnect, provider failure, or duration expiry.
4. Create `LiveTranslationService`. It translates only a final source segment, receives the selected target BCP-47 code, and returns plain target text. Keep the prompt/provider configuration centralized and testable.
5. Add `WebSocket('/api/live/session')` in FastAPI. Run independent tasks for browser input, provider output, and final-segment translation so slow translation cannot block new audio or new partial captions.
6. Enforce one active provider session per browser socket, a 9:30 warning, hard 10-minute stop, frame-size limit, and clean cancellation on disconnect.

**Backend tests:** mock live-provider events and translation responses; verify event ordering, language validation, final-only translation, invalid/binary-frame rejection, cancellation, missing-key behavior, and source transcript preservation when translation fails.

### Phase 2 — Browser audio streaming hook

**Files:** `frontend/src/audio/pcm-worklet.ts` (new), `frontend/src/hooks/useLiveCapture.ts` (new), `frontend/src/hooks/useLiveTranslation.ts` (new), `frontend/src/types/live.ts` (new), `frontend/src/hooks/__tests__/useLiveTranslation.test.tsx` (new)

1. Implement an `AudioWorklet` that downsamples microphone frames to mono PCM16, 16 kHz, and transfers ArrayBuffers without retaining previous frames.
2. Implement `useLiveCapture` to request the microphone with echo cancellation, noise suppression, and auto-gain; feed the worklet; expose audio level, elapsed time, start, stop, and cleanup.
3. Implement `useLiveTranslation` to own the WebSocket lifecycle, send `start` before audio, forward binary frames only when the socket is ready, and handle every server event.
4. Store transcript data as ordered segments rather than one mutable text string. Keep a separate partial source string, finalized source segments, and target segments keyed by `segmentId`.
5. Reconnect only for recoverable failures, with bounded backoff. Never replay an arbitrary amount of old audio; on reconnect show a gap notice and resume new microphone frames.
6. Ensure unmounting, Stop, mode changes, and a denied permission all close socket, audio context, and microphone tracks exactly once.

**Frontend tests:** mocked `WebSocket`, `MediaStream`, and worklet events verify partial replacement, final append, correct segment pairing, target-language change behavior, close cleanup, and recoverable error state.

### Phase 3 — Live-first interface

**Files:** `frontend/src/App.tsx`, `frontend/src/components/translation/LanguageToggle.tsx`, `frontend/src/components/translation/TargetLanguageSelect.tsx` (new), `frontend/src/components/translation/SourcePanel.tsx`, `frontend/src/components/translation/TargetPanel.tsx`, `frontend/src/components/recording/RecordButton.tsx`, `frontend/src/components/recording/RecordingStates.tsx`, relevant component tests

1. Replace the ID→EN / EN→ID direction buttons with:
   - a mode selector: `Live` / `Private`;
   - read-only `Source: Auto-detect` in Live Mode;
   - an accessible target-language dropdown.
2. Change the button interaction from hold-to-record to a clear `Start listening` / `Stop listening` toggle in Live Mode. Keep hold-to-record only in Private Mode.
3. Render finalized transcript segments in chronological order. Render source partial text separately with a subtle `Listening…` cue.
4. Render target segments aligned by segment ID. Use a small inline pending state between a finalized source segment and its target translation.
5. Show detected language as a label only after the backend has confidence/final data. Never use the label to overwrite the user-selected target.
6. Add accessible live-region announcements for connection state and errors, while avoiding announcement of every partial token.
7. Update copy behavior to copy all finalized text for each panel.

**Acceptance:** a user can start listening, speak English or Indonesian without selecting a source language, change target language, see partial source captions, and receive final translation segments without the UI clearing earlier content.

### Phase 4 — Private Mode compatibility and quality controls

**Files:** `frontend/src/hooks/useRecording.ts`, `frontend/src/hooks/useTranslation.ts`, `frontend/src/types/api.ts`, `frontend/src/services/api.ts`, existing tests

1. Keep existing upload endpoints and local model services unchanged behind Private Mode.
2. Rename types and labels where needed so the old `recording/processing/success` state cannot leak into Live Mode.
3. Show the accurate privacy description for each mode at all times.
4. Add a small settings surface for optional language hints and custom vocabulary only after the core auto-detect path is stable. Default must remain automatic detection.

**Acceptance:** users can switch to Private Mode and complete the existing record-release translation flow without a cloud key or an open WebSocket.

### Phase 5 — Verification and release readiness

**Files:** `frontend/e2e/live-translation.spec.ts` (new), `README.md` or project documentation, deployment configuration if required

1. Add Playwright coverage with a mocked WebSocket/provider for: permission denied, connect, partial text, finalized source + target translation, target change, stop, recoverable reconnect, and session-ending warning.
2. Run backend unit/integration tests, frontend unit tests, typecheck, lint, production build, and the existing regression suite.
3. Manually test in Chrome and Edge with English, Indonesian, code-switched speech, long pauses, names/numbers, no speech, network interruption, and microphone denial.
4. Record source-to-partial, source-final-to-target, reconnect count, provider errors, and session duration in development logs without persisting audio or transcript content.
5. Verify frontend bundles do not contain the provider key and that the user-visible privacy copy is correct.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Automatic detection misidentifies short/noisy speech | Keep Auto as default, display detection only after finalization, and add optional source-language hints later. |
| Partial text constantly rewrites | Render partial source text separately; translate final segments only. |
| Live provider has a ten-minute session limit | Warn at 9:30, stop cleanly at the limit, and schedule seamless renewal as a later feature. |
| Cloud Live Mode conflicts with the existing privacy promise | Preserve Private Mode and require a clear Live Mode disclosure before microphone capture. |
| Provider outage or slow text translation | Preserve source text, show segment-level retry/error feedback, use bounded retries, and never block audio relay. |
| API key leaks to browser | FastAPI owns the key; test the built frontend and prohibit key-bearing messages. |
| Audio encoding mismatch | Contract-test PCM16 16 kHz frames and add browser tests with an AudioWorklet mock; verify using live-device testing before release. |

## Delivery order

1. Phase 0 and Phase 1 create the safe backend contract.
2. Phase 2 makes the browser send and receive live data without changing the visible product yet.
3. Phase 3 exposes Live Mode to users.
4. Phase 4 protects the current local workflow.
5. Phase 5 is the release gate.

## Definition of done

- Live Mode detects a supported source language automatically and translates final speech segments into the selected target language.
- Source partials, finalized source text, and translated text stay visibly ordered and do not erase prior segments.
- Stop, errors, disconnects, permission denial, and session expiry are understandable and release microphone resources.
- The API key remains server-only, and cloud processing is transparently disclosed.
- Private Mode and all existing tests remain functional.
