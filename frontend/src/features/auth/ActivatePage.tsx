import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SubmitButton } from '@/components/ui/Action'
import { Field, FormError } from '@/components/ui/Field'
import { ApiError, apiRequest } from '@/lib/api/client'
import type { Role, Session } from '@/lib/api/session'
import { AuthPage } from './AuthPage'
import { homeFor, ROLE_NAMES, startSession } from './session'

/** POST /api/auth/activation/check */
type LinkOwner = { email: string; displayName: string; role: Role; activated: boolean }

/** Where an administrator's link points, with its secret after the #. */
export const ACTIVATE_PATH = '/activate'

/**
 * Where an activation link lands: an inspector sets their first password, or
 * anyone given a new link sets a new one. The link's secret is in the address
 * after the #, which browsers never send to a server, and it is taken out of
 * the address as soon as it is read, so it stays out of history and bookmarks.
 */
export function ActivatePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token'))

  useEffect(() => {
    document.title = 'Set your password · Sentinel'
    if (location.hash) {
      void navigate(location.pathname, { replace: true })
    }
  }, [location.hash, location.pathname, navigate])

  const owner = useQuery({
    queryKey: ['activation', token],
    queryFn: () =>
      apiRequest<LinkOwner>('/auth/activation/check', { method: 'POST', body: { token } }),
    enabled: token !== null,
    retry: false,
    staleTime: Infinity,
  })

  const intro = owner.data?.activated
    ? 'Choose a new password for your account.'
    : 'Choose the password you will sign in with.'

  return (
    <AuthPage
      title={owner.data ? `Welcome, ${owner.data.displayName}.` : 'Set your password'}
      intro={
        <p>{owner.data ? intro : 'This page opens from a link an administrator gives you.'}</p>
      }
    >
      {token === null ? (
        <FormError>
          This address has no link in it. Open the full link you were given, or ask an administrator
          for a new one.
        </FormError>
      ) : owner.isPending ? (
        <p role="status" className="text-small text-ink-70">
          Checking your link
        </p>
      ) : owner.isError ? (
        <FormError>{owner.error.message}</FormError>
      ) : (
        <PasswordForm
          token={token}
          owner={owner.data}
          onDone={(role) => void navigate(homeFor(role), { replace: true })}
        />
      )}
    </AuthPage>
  )
}

function PasswordForm({
  token,
  owner,
  onDone,
}: {
  token: string
  owner: LinkOwner
  onDone: (role: Role) => void
}) {
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [mismatch, setMismatch] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password !== again) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    setBusy(true)
    try {
      const session = await apiRequest<Session>('/auth/activate', {
        method: 'POST',
        body: { token, password },
      })
      startSession(session)
      onDone(session.account.role)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'Could not set the password.'))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-md" noValidate>
      <p className="text-small text-ink-70">
        Account <span className="font-medium text-ink">{owner.email}</span>,{' '}
        {ROLE_NAMES[owner.role]}.
      </p>
      <Field
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        hint="At least 12 characters. A few words together are easier to remember than symbols."
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={error?.problemWith('password')}
      />
      <Field
        label="The same password again"
        type="password"
        name="again"
        autoComplete="new-password"
        required
        value={again}
        onChange={(event) => setAgain(event.target.value)}
        error={mismatch ? 'does not match the password above' : undefined}
      />
      {error && !error.problemWith('password') ? <FormError>{error.message}</FormError> : null}
      <div>
        <SubmitButton busy={busy}>{busy ? 'Saving' : 'Set password and sign in'}</SubmitButton>
      </div>
    </form>
  )
}
