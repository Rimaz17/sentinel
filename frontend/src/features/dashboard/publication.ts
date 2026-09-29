import type { Alert } from './api/types'

/** Whether the public can see an alert, and on what grounds, in words. */
export function publicationWords(alert: Alert): string {
  if (alert.verdict === 'FALSE_ALARM') {
    return 'False alarm · not published'
  }
  if (alert.verdict === 'CONFIRMED') {
    return 'Confirmed · published'
  }
  return alert.published ? 'Published: past the higher threshold' : 'Not published'
}
