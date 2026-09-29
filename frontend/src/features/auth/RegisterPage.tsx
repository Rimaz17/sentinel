import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SubmitButton } from '@/components/ui/Action'
import { Field, FormError } from '@/components/ui/Field'
import { QuietButton } from '@/components/ui/QuietButton'
import { ApiError, apiRequest } from '@/lib/api/client'
import type { Session } from '@/lib/api/session'
import { caps, cx, labelSm } from '@/styles/recipes'
import { AuthPage } from './AuthPage'
import { StepRail } from './RouteRail'
import { startSession } from './session'

/** POST /api/auth/invite-codes/check */
type InvitePreview = {
  facilityCode: string
  facilityName: string
  institutionType: string
  districtCode: string
  districtName: string
}

/**
 * Registration for data providers, in two steps. The invite code comes first
 * and the page names the facility it belongs to, so someone with the wrong
 * code finds out before choosing a password. Without a valid code there is no
 * second step at all.
 */
export function RegisterPage() {
  const [preview, setPreview] = useState<{ code: string; facility: InvitePreview } | null>(null)

  useEffect(() => {
    document.title = 'Facility registration · Sentinel'
  }, [])

  return (
    <AuthPage
      title="Facility registration"
      intro={
        <p>
          For staff at a hospital, clinic or pharmacy who submit reports for their facility. You
          need the invite code your facility was given.
        </p>
      }
      rail={
        <StepRail
          label="Registration steps"
          steps={[
            preview
              ? { label: 'Invite code', state: 'done', value: preview.code.toUpperCase() }
              : { label: 'Invite code', state: 'current' },
            { label: 'Your account', state: preview ? 'current' : 'next' },
            { label: 'Submit reports', state: 'next' },
          ]}
        />
      }
      aside={
        <>
          <p>
            The code links your account to your facility for good: every report you submit counts as
            that facility’s. Without a valid code an account cannot be created.
          </p>
          <p>
            Public health inspectors do not register here. Their accounts are created by a system
            administrator.{' '}
            <Link to="/signin" className="text-ink underline">
              Staff sign-in
            </Link>
          </p>
        </>
      }
    >
      {preview ? (
        <AccountStep
          code={preview.code}
          facility={preview.facility}
          onChangeCode={() => setPreview(null)}
        />
      ) : (
        <CodeStep onFound={(code, facility) => setPreview({ code, facility })} />
      )}
    </AuthPage>
  )
}

function CodeStep({ onFound }: { onFound: (code: string, facility: InvitePreview) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const facility = await apiRequest<InvitePreview>('/auth/invite-codes/check', {
        method: 'POST',
        body: { inviteCode: code },
      })
      onFound(code, facility)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not check the code.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-md" noValidate>
      <Field
        label="Facility invite code"
        hint={
          <>
            Three letters for the district, then seven more, as in{' '}
            <span className="font-mono">KDY-7X2-M4QP</span>. Capitals and dashes do not matter.
          </>
        }
        name="inviteCode"
        width="code"
        autoComplete="off"
        spellCheck={false}
        required
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      {error ? <FormError>{error}</FormError> : null}
      <div>
        <SubmitButton busy={busy}>{busy ? 'Checking' : 'Check the code'}</SubmitButton>
      </div>
    </form>
  )
}

function AccountStep({
  code,
  facility,
  onChangeCode,
}: {
  code: string
  facility: InvitePreview
  onChangeCode: () => void
}) {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const session = await apiRequest<Session>('/auth/register', {
        method: 'POST',
        body: { inviteCode: code, displayName, email, password },
      })
      startSession(session)
      void navigate('/submit', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'Could not register.'))
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-md">
      <div className="grid gap-2xs">
        <p className={cx(labelSm, caps, 'text-ink-70')}>Your facility</p>
        <p className="text-section font-medium">{facility.facilityName}</p>
        <p className="text-small text-ink-70">
          {facility.institutionType} · {facility.districtName} district ·{' '}
          <span className="font-mono">{facility.facilityCode}</span>
        </p>
        <div>
          <QuietButton onClick={onChangeCode}>Not your facility? Use another code</QuietButton>
        </div>
      </div>

      <form onSubmit={(event) => void submit(event)} className="grid gap-md" noValidate>
        <Field
          label="Your name"
          name="displayName"
          width="md"
          autoComplete="name"
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          error={error?.problemWith('displayName')}
        />
        <Field
          label="Email address"
          type="email"
          name="email"
          width="lg"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error?.problemWith('email')}
        />
        <Field
          label="Password"
          type="password"
          name="password"
          width="md"
          autoComplete="new-password"
          hint="At least 12 characters. A few words together are easier to remember than symbols."
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error?.problemWith('password')}
        />
        {error && error.fieldProblems.length === 0 ? <FormError>{error.message}</FormError> : null}
        <div>
          <SubmitButton busy={busy}>
            {busy ? 'Creating the account' : 'Create account'}
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}
