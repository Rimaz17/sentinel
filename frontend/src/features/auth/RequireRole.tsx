import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { QuietButton } from '@/components/ui/QuietButton'
import type { Role } from '@/lib/api/session'
import { AuthPage, CheckingSession } from './AuthPage'
import { aRole, homeFor, signOut, useSession } from './session'

/**
 * Shows its children only to a signed-in person with the given role. Anyone
 * else is sent to sign in, and brought back here afterwards.
 *
 * This is navigation, not access control: the API refuses every request the
 * role may not make, whatever the browser shows.
 */
export function RequireRole({ allow, children }: { allow: Role; children: ReactNode }) {
  const state = useSession()
  const location = useLocation()

  if (state.status === 'unknown') {
    return <CheckingSession />
  }
  if (state.status === 'signed-out') {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }
  if (state.session.account.role !== allow) {
    return <WrongRole needed={allow} have={state.session.account.role} />
  }
  return children
}

function WrongRole({ needed, have }: { needed: Role; have: Role }) {
  const queryClient = useQueryClient()
  return (
    <AuthPage
      title="This page is not for your account."
      intro={
        <p>
          It is for {aRole(needed)}, and you are signed in as {aRole(have)}.
        </p>
      }
    >
      <div className="flex flex-wrap items-center gap-md">
        <Link to={homeFor(have)} className="text-ink underline">
          Go to your own page
        </Link>
        <QuietButton onClick={() => void signOut(queryClient)}>Sign out</QuietButton>
      </div>
    </AuthPage>
  )
}
