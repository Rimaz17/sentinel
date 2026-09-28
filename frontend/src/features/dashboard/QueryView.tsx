import { type UseQueryResult } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { QuietButton } from '@/components/ui/QuietButton'
import { cx, labelSm } from '@/styles/recipes'
import { formatClock } from './format'

type QueryViewProps<T> = {
  query: UseQueryResult<T>
  /** What is being loaded, in the plural a sentence can carry: "alerts". */
  what: string
  /** Shown while the first response is on its way. */
  loading: ReactNode
  /** Whether a successful response has nothing to show. */
  isEmpty?: (data: T) => boolean
  /** Shown for a successful response with nothing in it. */
  empty?: ReactNode
  children: (data: T) => ReactNode
}

/**
 * One way of handling a polled query's states, so every panel behaves alike:
 * a skeleton before the first response, the reason and a retry if that fails,
 * a teaching empty state, and, when a later poll fails, the last good figures
 * kept on screen with a note saying how old they are.
 */
export function QueryView<T>({
  query,
  what,
  loading,
  isEmpty,
  empty,
  children,
}: QueryViewProps<T>) {
  if (query.isPending) {
    return loading
  }
  if (query.isError && query.data === undefined) {
    return <ErrorState what={what} error={query.error} onRetry={() => void query.refetch()} />
  }
  const data = query.data as T
  return (
    <>
      {query.isError ? (
        <p
          role="status"
          className={cx(labelSm, 'mb-xs border-b border-b-ink-14 pb-2xs text-ink-70')}
        >
          Could not refresh {what}. Showing figures from {formatClock(query.dataUpdatedAt)}.
        </p>
      ) : null}
      {isEmpty?.(data) && empty !== undefined ? empty : children(data)}
    </>
  )
}

/** Ruled placeholder rows. The status text is for screen readers; the rows are not. */
export function LoadingRows({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <ul aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="grid gap-2xs border-b border-b-ink-08 py-sm">
            <span className="block h-[0.75rem] w-3/5 bg-ink-08" />
            <span className="block h-[0.6rem] w-2/5 bg-ink-04" />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ErrorState({
  what,
  error,
  onRetry,
}: {
  what: string
  error: Error
  onRetry: () => void
}) {
  return (
    <div role="alert" className="grid justify-items-start gap-2xs border-t border-t-ink py-sm">
      <p className="font-medium">Could not load {what}.</p>
      <p className="text-small text-ink-70">{error.message}</p>
      <QuietButton onClick={onRetry}>Try again</QuietButton>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2xs border-t border-t-ink-14 py-sm">
      <p className="font-medium">{title}</p>
      <p className="max-w-measure-narrow text-small text-ink-70">{children}</p>
    </div>
  )
}
