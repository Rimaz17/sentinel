import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SubmitButton } from '@/components/ui/Action'
import { Field, FormError } from '@/components/ui/Field'
import { QuietButton } from '@/components/ui/QuietButton'
import { ApiError, apiRequest } from '@/lib/api/client'
import type { Session } from '@/lib/api/session'
import { AuthPage, CheckingSession } from './AuthPage'
import { homeFor, mayOpen, ROLE_NAMES, signOut, startSession, useSession } from './session'

/**
 * One sign-in for both staff roles. Data providers are sent to report
 * submission, inspectors to the internal dashboard, administrators to
 * administration, or each back to the page that sent them here.
 *
 * There is no registration link: inspector accounts are created by an
 * administrator, and a data provider's registration starts from the front page
 * with their facility's invite code.
 */
export function SignInPage() {
  const state = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = 'Staff sign-in · Sentinel'
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const session = await apiRequest<Session>('/auth/signin', {
        method: 'POST',
        body: { email, password },
      })
      startSession(session)
      const role = session.account.role
      void navigate(from && mayOpen(role, from) ? from : homeFor(role), { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not sign in.')
      setBusy(false)
    }
  }

  if (state.status === 'unknown') {
    return <CheckingSession />
  }

  return (
    <AuthPage
      title="Staff sign-in"
      intro={<p>For healthcare data providers and public health inspectors.</p>}
      aside={
        <>
          <p>
            Inspector accounts are created by a system administrator, and there is no sign-up for
            them. An inspector without an account should contact their district administrator to
            request access.
          </p>
          <p>
            Healthcare data providers register with their facility’s invite code, from{' '}
            <Link to="/" className="text-ink underline">
              the front page
            </Link>
            .
          </p>
        </>
      }
    >
      {state.status === 'signed-in' ? (
        <SignedIn session={state.session} />
      ) : (
        <form onSubmit={(event) => void submit(event)} className="grid gap-md" noValidate>
          <Field
            label="Email address"
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Field
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <FormError>{error}</FormError> : null}
          <div>
            <SubmitButton busy={busy}>{busy ? 'Signing in' : 'Sign in'}</SubmitButton>
          </div>
        </form>
      )}
    </AuthPage>
  )
}

/** Already signed in: carry on, or sign out to change account. */
function SignedIn({ session }: { session: Session }) {
  const queryClient = useQueryClient()
  const { displayName, role } = session.account
  return (
    <div className="grid gap-sm border-t border-t-ink pt-sm">
      <p>
        Signed in as <span className="font-medium">{displayName}</span>, {ROLE_NAMES[role]}.
      </p>
      <div className="flex flex-wrap items-center gap-md">
        <Link to={homeFor(role)} className="text-ink underline">
          Continue
        </Link>
        <QuietButton onClick={() => void signOut(queryClient)}>Sign out</QuietButton>
      </div>
    </div>
  )
}
