import { useEffect } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { SkipLink } from '@/components/layout/SkipLink'
import { StaffHeader } from '@/features/auth/AccountBar'
import { useAccount } from '@/features/auth/session'
import { isDemoAdministrator, resetTime, useDemo } from '@/features/demo/api'
import { cx, monoLink, shell } from '@/styles/recipes'
import { AccountsSection } from './AccountsSection'
import { FacilitiesSection } from './FacilitiesSection'

const SECTIONS = [
  { to: '/app/admin', label: 'Inspectors and accounts', end: true },
  { to: '/app/admin/facilities', label: 'Facilities and invite codes', end: false },
]

/**
 * Administration: inspector accounts, which are created here and nowhere else,
 * and the facility registry's invite codes, the only way a data provider can
 * register. Each section is set as sheet panels, like the dashboards, under a
 * pair of section tabs; the section in view is inked in, paper on ink, as the
 * staff pages' step rail marks the current step.
 */
export function AdminPage() {
  const account = useAccount()
  const demo = useDemo()

  useEffect(() => {
    document.title = 'Administration · Sentinel'
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <StaffHeader section="Administration" account={account}>
        {isDemoAdministrator(demo.data, account.email) ? (
          <p className="max-w-measure text-small text-ink-70">
            You are the demo administrator. Changes that would spoil the demo for the next visitor
            are switched off, and what visitors make is removed every night at{' '}
            {demo.data ? resetTime(demo.data) : null} Sri Lanka time.
          </p>
        ) : null}
      </StaffHeader>
      <main id="main" className={cx(shell, 'grid flex-1 content-start gap-md py-md')}>
        <nav aria-label="Administration">
          <ul className="flex flex-wrap gap-2xs">
            {SECTIONS.map((section) => (
              <li key={section.to}>
                <NavLink
                  to={section.to}
                  end={section.end}
                  className={({ isActive }) =>
                    cx(
                      monoLink,
                      'inline-block rounded-control border px-sm py-xs font-medium no-underline',
                      'transition-[color,background-color,border-color] duration-(--dur-fast) ease-out',
                      isActive
                        ? 'border-ink bg-ink text-paper'
                        : 'border-ink-14 bg-card text-ink-70 hover:border-ink-40 hover:text-ink',
                    )
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Routes>
          <Route index element={<AccountsSection />} />
          <Route path="facilities" element={<FacilitiesSection />} />
          <Route path="*" element={<Navigate to="/app/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}
