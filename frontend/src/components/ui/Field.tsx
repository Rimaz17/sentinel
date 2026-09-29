import { type InputHTMLAttributes, type ReactNode, useId } from 'react'
import { caps, cx, labelSm } from '@/styles/recipes'

/**
 * How wide the input is, from what goes in it: an age or a coordinate, an
 * invite code or a time, a name or a password, an email address. Left out, the
 * input takes its column's width.
 */
export type FieldWidth = 'sm' | 'code' | 'md' | 'lg'

const WIDTHS: Record<FieldWidth, string> = {
  sm: 'max-w-field-sm',
  code: 'max-w-field-code',
  md: 'max-w-field',
  lg: 'max-w-field-lg',
}

type FieldProps = {
  label: string
  /** What to enter and why. Beside a sized input where there is room, under it otherwise. */
  hint?: ReactNode
  /** Why the value was refused, from the API or the form. */
  error?: string | undefined
  width?: FieldWidth
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'aria-describedby' | 'aria-invalid'>

/**
 * A labelled text input. The label is a real <label>, the hint and the error
 * are tied to the input for screen readers, and a refused field says why in
 * words beside a rule, never in colour alone.
 */
export function Field({ label, hint, error, width, className, ...input }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={cx('grid gap-3xs', className)}>
      <label htmlFor={id} className={cx(labelSm, caps, 'text-ink-70')}>
        {label}
      </label>
      <div className="flex flex-wrap items-start gap-x-sm gap-y-3xs">
        <input
          id={id}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          className={cx(
            'w-full border bg-paper-raised px-xs py-2xs text-body',
            width ? WIDTHS[width] : null,
            error ? 'border-ink' : 'border-ink-24',
          )}
          {...input}
        />
        {hint ? (
          <p
            id={hintId}
            className={cx(
              'text-small text-ink-70',
              width ? 'min-w-[12rem] flex-1 basis-[12rem] self-center' : 'w-full',
            )}
          >
            {hint}
          </p>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="border-l-2 border-l-ink ps-2xs text-small font-medium">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** A form-level refusal: what went wrong, announced as it appears. */
export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="border-t border-t-ink pt-xs text-small font-medium">
      {children}
    </p>
  )
}
