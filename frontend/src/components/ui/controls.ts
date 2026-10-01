/*
 * The look every form control shares: fields, selects and searches on the staff
 * pages and both dashboards. Each string is a complete literal, so Tailwind can
 * find its classes.
 */

/** A field's label: sentence case in the body face, a step above its hint. */
export const fieldLabel = 'text-small font-medium text-ink'

/**
 * A text field, select or search box: a white, rounded box, a hair above the
 * card, whose ink-55 edge (3.72:1 on white) darkens under the pointer and goes
 * to full ink with focus. The caller sets its height and text size; a refused
 * field passes `refused` so its edge stays at full ink.
 */
export function fieldControl(refused = false): string {
  return [
    'w-full rounded-control border bg-field text-ink shadow-field placeholder:text-ink-70',
    'transition-[border-color] duration-(--dur-fast) ease-out focus-visible:border-ink',
    refused ? 'border-ink' : 'border-ink-55 hover:border-ink-70',
  ].join(' ')
}

export type ButtonVariant = 'primary' | 'secondary'

/**
 * The two button shapes on the staff pages and the demo panels. Primary is a
 * solid ink button, the one thing a form is for: signing in, registering,
 * submitting a report. Secondary is a white button with a hairline edge, for a
 * helping step beside it, such as filling in a demo account. Both sit on the
 * control radius. A primary button is as tall as a field, so it lines up with
 * the fields above it, and below 30rem it spans its column.
 */
export const BUTTON: Record<ButtonVariant, string> = {
  primary: [
    'inline-flex h-[2.75rem] cursor-pointer items-center justify-center gap-xs rounded-control bg-ink px-md',
    'text-body font-medium whitespace-nowrap text-paper no-underline',
    'transition-[background-color] duration-(--dur-fast) ease-out hover:bg-ink-85',
    'disabled:cursor-default disabled:bg-ink-70 phone:w-full',
  ].join(' '),
  secondary: [
    'inline-flex h-[2.5rem] cursor-pointer items-center justify-center gap-xs rounded-control border border-ink-24 bg-field px-sm',
    'text-small font-medium whitespace-nowrap text-ink no-underline shadow-field',
    'transition-[border-color,background-color] duration-(--dur-fast) ease-out hover:border-ink-55 hover:bg-paper-raised',
    'disabled:cursor-default disabled:text-ink-70',
  ].join(' '),
}
