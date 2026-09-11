import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

export interface PanelGridProps {
  children: ReactNode
  className?: string
}

export function PanelGrid({ children, className }: PanelGridProps) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4', className)}>
      {children}
    </div>
  )
}