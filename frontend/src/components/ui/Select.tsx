import { type SelectHTMLAttributes } from 'react'
import { cx } from '@/styles/recipes'
import { fieldControl } from './controls'

/**
 * A native select in the field's look. The platform's own arrow is hidden and
 * a drawn chevron sits in its place, so the select matches the fields beside
 * it on every browser; the list it opens is still the platform's.
 */
export function Select({
  className,
  children,
  ...select
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cx('relative', className)}>
      <select
        {...select}
        className={cx(
          fieldControl(),
          'h-[2.75rem] cursor-pointer appearance-none ps-sm pe-xl text-body',
        )}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute end-sm top-1/2 size-[1rem] -translate-y-1/2 text-ink-70"
      >
        <path
          d="M4 6l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
