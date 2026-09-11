import { Header } from './Header'
import { Footer } from './Footer'
import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

export interface MainLayoutProps {
  children: ReactNode
  className?: string
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-[var(--bg-primary)] text-[var(--fg-primary)] flex flex-col', className)}>
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {children}
      </main>
      <Footer />
    </div>
  )
}