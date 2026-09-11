import { Button } from '../ui/Button'
import { Translate } from '@phosphor-icons/react'
import { cn } from '@/utils/cn'

export interface LanguageToggleProps {
  mode: 'id-en' | 'en-id'
  onChange: (mode: 'id-en' | 'en-id') => void
  className?: string
}

const MODES = {
  'id-en': { label: 'ID → EN', sourceLabel: 'INDONESIAN', targetLabel: 'ENGLISH' },
  'en-id': { label: 'EN → ID', sourceLabel: 'ENGLISH', targetLabel: 'INDONESIAN' },
}

export function LanguageToggle({ mode, onChange, className }: LanguageToggleProps) {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-center gap-2', className)}
      role="group"
      aria-label="Translation direction"
    >
      {Object.entries(MODES).map(([key, config]) => (
        <Button
          key={key}
          onClick={() => onChange(key as 'id-en' | 'en-id')}
          variant={mode === key ? 'primary' : 'outline'}
          aria-pressed={mode === key}
          aria-label={`Translate ${config.sourceLabel} to ${config.targetLabel}`}
          className="transition-all duration-fast"
        >
          <Translate className="w-4 h-4" aria-hidden="true" />
          <span className="font-medium">{config.label}</span>
        </Button>
      ))}
    </div>
  )
}