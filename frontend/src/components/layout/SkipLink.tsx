import { monoLink } from '@/styles/recipes'

/** Sits above everything and only appears when tabbed to. */
export function SkipLink() {
  return (
    <a
      className={`absolute top-0 left-gutter z-50 -translate-y-[120%] bg-ink px-[1.1rem] py-[0.75rem] text-paper no-underline transition-transform duration-(--dur-base) ease-out focus-visible:translate-y-0 focus-visible:outline-offset-[3px] ${monoLink}`}
      href="#main"
    >
      Skip to content
    </a>
  )
}
