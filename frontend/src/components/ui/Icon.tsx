import { forwardRef, type ComponentType, type SVGProps } from 'react'
import { cn } from '@/utils/cn'

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
}

export function createIcon(Component: ComponentType<SVGProps<SVGSVGElement>>) {
  return forwardRef<SVGSVGElement, IconProps>(
    ({ className, size = 'md', 'aria-hidden': ariaHidden = 'true', ...props }, ref) => (
      <Component
        ref={ref}
        className={cn(sizeClasses[size], className)}
        aria-hidden={ariaHidden}
        {...props}
      />
    )
  )
}