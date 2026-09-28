/*
 * Formatting for measured values. Times are shown in Sri Lanka time, the time
 * inspectors work in, whatever the viewer's own clock is set to.
 */

export const TIME_ZONE = 'Asia/Colombo'

const counts = new Intl.NumberFormat('en-GB')
const oneDecimal = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
/*
 * Month names are spelled here rather than left to Intl, whose short English
 * September is "Sep" in some ICU versions and "Sept" in others.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const calendar = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
function parts(iso: string) {
  const found: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const part of calendar.formatToParts(new Date(iso))) {
    found[part.type] = part.value
  }
  return {
    day: found.day ?? '',
    month: MONTHS[Number(found.month) - 1] ?? '',
    hour: found.hour ?? '',
    minute: found.minute ?? '',
  }
}

/** 1,142 */
export function formatCount(value: number): string {
  return counts.format(value)
}

/** 25.0 */
export function formatDecimal(value: number): string {
  return oneDecimal.format(value)
}

/** 3.2σ. Never uppercased: that would turn σ into Σ. */
export function formatSigma(value: number): string {
  return `${oneDecimal.format(value)}σ`
}

/** 28 Sep, 14:00 */
export function formatDateTime(iso: string): string {
  const { day, month, hour, minute } = parts(iso)
  return `${day} ${month}, ${hour}:${minute}`
}

/** 14:02:31 */
export function formatClock(epochMs: number): string {
  return clock.format(new Date(epochMs))
}

/** 28 Sep */
export function formatDay(iso: string): string {
  const { day, month } = parts(iso)
  return `${day} ${month}`
}

/** How long before `now` a moment was: "just now", "12 min ago", "5 h ago", "3 d ago". */
export function formatAgo(iso: string, now: number): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.floor(hours / 24)} d ago`
}
