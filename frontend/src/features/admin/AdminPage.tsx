import { useEffect } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { SkipLink } from '@/components/layout/SkipLink'
import { StaffHeader } from '@/features/auth/AccountBar'
import { useAccount } from '@/features/auth/session'
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
 * register.
 */
export function AdminPage() {
  const account = useAccount()

  useEffect(() => {
    document.title = 'Administration · Sentinel'
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <StaffHeader section="Administration" account={account} />
      <nav aria-label="Administration" className="border-b border-b-ink-14">
        <ul className={cx(shell, 'flex flex-wrap gap-x-lg')}>
          {SECTIONS.map((section) => (
            <li key={section.to}>
              <NavLink
                to={section.to}
                end={section.end}
                className={({ isActive }) =>
                  cx(
                    monoLink,
                    'inline-block border-b-2 py-xs font-medium no-underline',
                    isActive
                      ? 'border-b-ink text-ink'
                      : 'border-b-transparent text-ink-70 hover:text-ink',
                  )
                }
              >
                {section.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" className={cx(shell, 'grid flex-1 content-start gap-xl py-xl')}>
        <Routes>
          <Route index element={<AccountsSection />} />
          <Route path="facilities" element={<FacilitiesSection />} />
          <Route path="*" element={<Navigate to="/app/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}
