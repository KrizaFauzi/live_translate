import { cn } from '@/utils/cn'

export interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn('border-t border-[var(--border)]/50 bg-[var(--bg-primary)]/80 backdrop-blur-sm', className)}>
      <div className="max-w-4xl mx-auto px-4 py-4 text-center text-caption text-[var(--fg-muted)]">
        Built with React, Tailwind CSS, Whisper & MarianMT — Runs locally via Docker
      </div>
    </footer>
  )
}