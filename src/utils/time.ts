/** Time formatting utilities */

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return formatShortDate(date)
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`

  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`

  const mins = Math.floor(secs / 60)
  const remainingSecs = secs % 60
  return `${mins}m ${remainingSecs}s`
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function parseISODate(dateStr: string): Date {
  return new Date(dateStr)
}

export function isOlderThan(date: Date, ms: number): boolean {
  return Date.now() - date.getTime() > ms
}

export function isNewerThan(date: Date, ms: number): boolean {
  return Date.now() - date.getTime() < ms
}
