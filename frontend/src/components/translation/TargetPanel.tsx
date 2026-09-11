import { Copy, Spinner } from '@phosphor-icons/react'
import { Button } from '../ui/Button'
import { Tooltip } from '../ui/Tooltip'
import { cn } from '@/utils/cn'
import type { LiveTargetSegment, TargetLanguage } from '@/types/live'

export function TargetPanel({ segments, targetLanguage, onCopy, className }: { segments: LiveTargetSegment[]; targetLanguage: TargetLanguage; onCopy: () => void; className?: string }) {
  const text = segments.filter((segment) => !segment.pending).map((segment) => segment.text).join('\n')
  return <section className={cn('card p-6 min-h-[280px] flex flex-col', className)} aria-labelledby="target-heading"><header className="flex items-center justify-between mb-4"><h2 id="target-heading" className="label text-[var(--fg-muted)]">TRANSLATION · {targetLanguage.toUpperCase()}</h2><Tooltip content="Copy translation" position="right"><Button variant="ghost" size="sm" onClick={onCopy} disabled={!text} aria-label="Copy translation"><Copy className="w-4 h-4" aria-hidden="true" /></Button></Tooltip></header><div className="flex-1 overflow-y-auto space-y-3">{segments.map((segment) => segment.pending ? <div key={segment.segmentId} className="flex gap-2 text-sm text-[var(--fg-muted)]"><Spinner className="w-4 h-4 animate-spin" /> Translating...</div> : <p key={segment.segmentId} className="text-body leading-relaxed whitespace-pre-wrap">{segment.text}</p>)}{!segments.length && <p className="text-[var(--fg-muted)] text-center py-8">Translation will appear here</p>}</div></section>
}
