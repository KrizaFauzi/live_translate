import { ThemeToggle } from '../ui/ThemeToggle'
import { cn } from '@/utils/cn'

export interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  return (
    <header className={cn('border-b border-[var(--border)]/50 bg-[var(--bg-primary)]/80 backdrop-blur-sm sticky top-0 z-10', className)}>
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-h1 font-bold tracking-tight text-balance">Voice Translator</h1>
            <p className="text-body-sm text-[var(--fg-muted)] mt-0.5">
              Live speech-to-text powered by Deepgram
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
