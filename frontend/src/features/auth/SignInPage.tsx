import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SubmitButton } from '@/components/ui/Action'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Field, FormError } from '@/components/ui/Field'
import { QuietButton } from '@/components/ui/QuietButton'
import { useDemo } from '@/features/demo/api'
import { DEMO_ACCOUNTS_HEADING, DemoAccountsPanel } from '@/features/demo/DemoAccountsPanel'
import { ApiError, apiRequest } from '@/lib/api/client'
import type { Session } from '@/lib/api/session'
import { AuthPage, CheckingSession } from './AuthPage'
import { RouteList } from './RouteRail'
import {
  afterSignIn,
  homeFor,
  type LeftPage,
  ROLE_NAMES,
  signOut,
  startSession,
  useSession,
} from './session'

/**
 * The page left behind for sign-in, from the router's state. That state
 * survives a reload in the browser's history, so its shape is checked rather
 * than trusted.
 */
function leftPage(state: unknown): LeftPage | null {
  if (typeof state !== 'object' || state === null) {
    return null
  }
  const { from, leftBy } = state as Record<string, unknown>
  if (typeof from !== 'string') {
    return null
  }
  return { from, leftBy: typeof leftBy === 'number' ? leftBy : null }
}

/**
 * One sign-in for both staff roles. Data providers are sent to report
 * submission, inspectors to the internal dashboard, administrators to
 * administration, or each back to the page that sent them here if it was
 * theirs.
 *
 * There is no registration link: inspector accounts are created by an
 * administrator, and a data provider's registration starts from the front page
 * with their facility's invite code.
 */
export function SignInPage() {
  const state = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const left = leftPage(location.state)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [filledAs, setFilledAs] = useState<string | null>(null)
  const form = useRef<HTMLFormElement>(null)
  const demo = useDemo()

  useEffect(() => {
    document.title = 'Staff sign-in · Sentinel'
  }, [])

  /**
   * Brings the demo accounts into view and moves focus to their heading, so a
   * keyboard or screen reader user lands where a sighted visitor is taken.
   */
  function showDemoAccounts() {
    const heading = document.getElementById(DEMO_ACCOUNTS_HEADING)
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    heading?.scrollIntoView?.({ behavior: still ? 'auto' : 'smooth', block: 'start' })
    heading?.focus({ preventScroll: true })
  }

  /**
   * Fills in a demo account and moves focus to "Sign in", so the visitor signs
   * in through the form itself; on a phone that also brings the form back into
   * view from the panel below it.
   */
  function fillDemoAccount(account: { email: string }, password: string, title: string) {
    setEmail(account.email)
    setPassword(password)
    setError(null)
    setFilledAs(title)
    form.current?.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus()
  }

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
      void navigate(afterSignIn(session.account, left), { replace: true })
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
      rail={
        <RouteList
          label="Where signing in takes you"
          routes={[
            { who: 'Healthcare data provider', where: 'Report submission' },
            { who: 'Public health inspector', where: 'Internal dashboard' },
          ]}
        />
      }
      after={
        demo.data && state.status !== 'signed-in' ? (
          <DemoAccountsPanel
            demo={demo.data}
            onUse={(account, title) => fillDemoAccount(account, demo.data?.password ?? '', title)}
          />
        ) : null
      }
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
        <form
          ref={form}
          onSubmit={(event) => void submit(event)}
          className="grid gap-md"
          noValidate
        >
          <Field
            label="Email address"
            type="email"
            name="email"
            width="lg"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setFilledAs(null)
            }}
          />
          <Field
            label="Password"
            type="password"
            name="password"
            width="lg"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setFilledAs(null)
            }}
          />
          {error ? <FormError>{error}</FormError> : null}
          <p role="status" className="text-small text-ink-70 empty:hidden">
            {filledAs ? `Filled in the demo account: ${filledAs}. Select Sign in to continue.` : ''}
          </p>
          <div>
            <SubmitButton busy={busy}>{busy ? 'Signing in' : 'Sign in'}</SubmitButton>
          </div>
          {demo.data ? (
            <div className="grid max-w-field-lg justify-items-start gap-xs border-t border-t-ink-14 pt-md">
              <p className="text-small text-ink-70">
                No account? Sentinel is a demonstration, so you can sign in with one of its demo
                accounts.
              </p>
              <Button onClick={showDemoAccounts}>Try a demo account</Button>
            </div>
          ) : null}
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
    <div className="grid gap-sm">
      <p>
        Signed in as <span className="font-medium">{displayName}</span>, {ROLE_NAMES[role]}.
      </p>
      <div className="flex flex-wrap items-center gap-md">
        <ButtonLink to={homeFor(role)}>Continue</ButtonLink>
        <QuietButton onClick={() => void signOut(queryClient)}>Sign out</QuietButton>
      </div>
    </div>
  )
}
