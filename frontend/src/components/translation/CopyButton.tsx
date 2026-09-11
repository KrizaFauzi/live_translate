import { useState, useCallback } from 'react'
import { Copy, Check } from '@phosphor-icons/react'
import { Button } from '../ui/Button'
import { Tooltip } from '../ui/Tooltip'
import { useToast } from '../ui/Toast'
import { cn } from '@/utils/cn'

export interface CopyButtonProps {
  text: string
  label?: string
  disabled?: boolean
  className?: string
}

export function CopyButton({ text, label = 'Copy', disabled, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()

  const handleCopy = useCallback(async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      showToast('Copied to clipboard', 'success', 2000)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Failed to copy', 'error', 3000)
    }
  }, [text, showToast])

  return (
    <Tooltip content={copied ? 'Copied!' : label} position="top" delay={200}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        disabled={disabled || !text}
        aria-label={label}
        className={cn('p-2', className)}
      >
        {copied ? (
          <Check className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
        ) : (
          <Copy className="w-4 h-4" aria-hidden="true" />
        )}
      </Button>
    </Tooltip>
  )
}