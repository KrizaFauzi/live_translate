import { useEffect, useCallback } from 'react'

interface KeyboardShortcutsOptions {
  onRecord?: () => void
  onStopRecord?: () => void
  onCopySource?: () => void
  onCopyTarget?: () => void
  onToggleTheme?: () => void
  onToggleMode?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onRecord,
  onStopRecord,
  onCopySource,
  onCopyTarget,
  onToggleTheme,
  onToggleMode,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return

    const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
    const isModifier = e.metaKey || e.ctrlKey

    if (e.code === 'Space' && !isInput && !isModifier) {
      e.preventDefault()
      if (onRecord) onRecord()
    }

    if (e.code === 'Escape' && !isInput) {
      e.preventDefault()
      if (onStopRecord) onStopRecord()
    }

    if (isModifier && e.code === 'KeyC') {
      if (onCopySource || onCopyTarget) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const container = range.commonAncestorContainer
          if (container instanceof Element) {
            if (container.closest('[data-panel="source"]') && onCopySource) {
              e.preventDefault()
              onCopySource()
            } else if (container.closest('[data-panel="target"]') && onCopyTarget) {
              e.preventDefault()
              onCopyTarget()
            }
          }
        }
      }
    }

    if (isModifier && e.code === 'KeyD') {
      e.preventDefault()
      if (onToggleTheme) onToggleTheme()
    }

    if (isModifier && e.code === 'KeyL') {
      e.preventDefault()
      if (onToggleMode) onToggleMode()
    }
  }, [enabled, onRecord, onStopRecord, onCopySource, onCopyTarget, onToggleTheme, onToggleMode])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}