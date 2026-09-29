import { type ReactNode } from 'react'
import { cx } from '@/styles/recipes'

type PanelTone = 'sheet' | 'ruled'

const TONES: Record<PanelTone, string> = {
  /* The dashboards and the report form: a rounded sheet on a low shadow. */
  sheet: 'rounded-panel border border-ink-08 bg-card shadow-panel',
  /* The staff sign-in pages: a square box in a 1px ink rule, flat. */
  ruled: 'border border-ink bg-card',
}

type PanelProps = {
  as?: 'section' | 'div' | 'nav' | 'aside'
  tone?: PanelTone
  /** The id of the panel's heading, so the panel is announced by its name. */
  labelledBy?: string
  className?: string
  children: ReactNode
}

/**
 * One piece of a working page, set on its own sheet so the page reads as a set
 * of panels rather than one long column. Every panel is named by its heading.
 */
export function Panel({
  as: Tag = 'section',
  tone = 'sheet',
  labelledBy,
  className,
  children,
}: PanelProps) {
  return (
    <Tag
      aria-labelledby={labelledBy}
      className={cx('grid min-w-0 content-start gap-sm p-sm md:p-md', TONES[tone], className)}
    >
      {children}
    </Tag>
  )
}

/**
 * A panel's heading, with room on its right for a count, a control or a note.
 */
export function PanelHeading({
  id,
  children,
  aside,
  description,
}: {
  id: string
  children: ReactNode
  aside?: ReactNode
  description?: ReactNode
}) {
  return (
    <div className="grid gap-3xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-sm gap-y-3xs">
        <h2 id={id} className="text-section leading-snug font-medium tracking-tight">
          {children}
        </h2>
        {aside}
      </div>
      {description ? <p className="max-w-measure text-small text-ink-70">{description}</p> : null}
    </div>
  )
}
