import { useState, useRef, useEffect, type ReactNode, type FC } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

export interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export const Tooltip: FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLElement>(null)
  const timeoutRef = useRef<number>()

  const show = () => {
    timeoutRef.current = window.setTimeout(() => {
      if (triggerRef.current) {
        setTriggerRect(triggerRef.current.getBoundingClientRect())
      }
      setIsVisible(true)
    }, delay)
  }

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (!triggerRef.current || !isVisible || !triggerRect) {
    return (
      <span ref={triggerRef} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
        {children}
      </span>
    )
  }

  const positions = {
    top: {
      tooltip: `left-1/2 -translate-x-1/2 bottom-full mb-2`,
      arrow: `left-1/2 -translate-x-1/2 top-full border-t-[var(--fg-primary)]`,
    },
    bottom: {
      tooltip: `left-1/2 -translate-x-1/2 top-full mt-2`,
      arrow: `left-1/2 -translate-x-1/2 bottom-full border-b-[var(--fg-primary)]`,
    },
    left: {
      tooltip: `right-full mr-2 top-1/2 -translate-y-1/2`,
      arrow: `top-1/2 -translate-y-1/2 left-full border-l-[var(--fg-primary)]`,
    },
    right: {
      tooltip: `left-full ml-2 top-1/2 -translate-y-1/2`,
      arrow: `top-1/2 -translate-y-1/2 right-full border-r-[var(--fg-primary)]`,
    },
  }

  const pos = positions[position]

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${triggerRect.left + triggerRect.width / 2}px`,
    top: `${triggerRect.top}px`,
    zIndex: 50,
    pointerEvents: 'none',
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {isVisible && triggerRect && createPortal(
        <div
          style={tooltipStyle}
          className={cn(
            'absolute px-2 py-1.5 text-xs font-medium text-[var(--bg-primary)] bg-[var(--fg-primary)] rounded shadow-lg whitespace-nowrap animate-fade-in',
            pos.tooltip
          )}
          role="tooltip"
        >
          {content}
          <div
            className={cn(
              'absolute w-0 h-0 border-4 border-transparent',
              pos.arrow
            )}
            aria-hidden="true"
          />
        </div>,
        document.body
      )}
    </>
  )
}