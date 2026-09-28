import { caps, cx, labelSm } from '@/styles/recipes'

/**
 * The one thing every visitor must know, and one of the two places the ochre
 * is spent: an ochre wash and a 1px ochre rule. It appears on every surface
 * that shows case data, and it never gets quieter.
 */
export function SimulatedNotice({ className }: { className?: string }) {
  return (
    <p
      className={cx(
        labelSm,
        caps,
        'w-fit border-l border-l-ochre bg-ochre-wash px-[0.7rem] py-[0.55rem] text-ink-85',
        className,
      )}
    >
      All case data simulated · demonstration system
    </p>
  )
}
