import { TARGET_LANGUAGES, type TargetLanguage } from '@/types/live'

export function TargetLanguageSelect({ value, onChange }: { value: TargetLanguage; onChange: (value: TargetLanguage) => void }) {
  return <label className="flex items-center justify-center gap-2 text-sm text-[var(--fg-secondary)]"><span>Translate to</span><select value={value} onChange={(event) => onChange(event.target.value as TargetLanguage)} className="rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--fg-primary)] focus-ring" aria-label="Target translation language">{TARGET_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}</select></label>
}
