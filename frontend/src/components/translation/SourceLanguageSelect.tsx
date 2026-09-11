import { SOURCE_LANGUAGES, type SourceLanguage } from '@/types/live'

export interface SourceLanguageSelectProps {
  value: SourceLanguage
  onChange: (value: SourceLanguage) => void
  disabled?: boolean
}

export function SourceLanguageSelect({ value, onChange, disabled }: SourceLanguageSelectProps) {
  return (
    <label className="flex items-center justify-center gap-2 text-sm text-[var(--fg-secondary)]">
      <span>Speak in</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SourceLanguage)}
        disabled={disabled}
        className="rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--fg-primary)] focus-ring disabled:opacity-50"
        aria-label="Source speech language"
      >
        {SOURCE_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
      </select>
    </label>
  )
}
