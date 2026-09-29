import { type FormEvent, useState } from 'react'
import { SubmitButton } from '@/components/ui/Action'
import { Field, FormError } from '@/components/ui/Field'
import { QuietButton } from '@/components/ui/QuietButton'
import { ACTIVATE_PATH } from '@/features/auth/ActivatePage'
import { ROLE_NAMES, useAccount } from '@/features/auth/session'
import { formatDateTime } from '@/features/dashboard/format'
import { EmptyState, LoadingRows, QueryView } from '@/features/dashboard/QueryView'
import { ApiError } from '@/lib/api/client'
import { caps, cx, labelSm, sectionTitle } from '@/styles/recipes'
import {
  type AdminAccount,
  type DistrictName,
  type IssuedAccount,
  useAccounts,
  useChangeAccount,
  useCreateInspector,
  useDistrictNames,
  useNewLink,
} from './api'
import { ShownOnce } from './ShownOnce'

const panelTitle = 'text-section leading-snug font-medium tracking-tight'

/** The address an inspector follows, with the link's secret after the #. */
function activationLink(token: string): string {
  return `${window.location.origin}${ACTIVATE_PATH}#token=${token}`
}

/**
 * Inspector accounts are created here, by an administrator, and nowhere else.
 * A new inspector has no password: the page shows a one-time link to pass on,
 * and following it they choose their own.
 */
export function AccountsSection() {
  const [issued, setIssued] = useState<IssuedAccount | null>(null)
  const districtNames = useDistrictNames()

  return (
    <>
      <div className="grid gap-xs">
        <h1 className={sectionTitle}>Inspectors and accounts</h1>
        <p className="max-w-measure text-body text-ink-70">
          Public health inspectors cannot sign up. Create their account here, then pass them the
          link it gives you, by a channel you trust. Sentinel sends no email.
        </p>
      </div>

      {issued ? (
        <ShownOnce
          title="Activation link"
          value={activationLink(issued.activationToken)}
          onDismiss={() => setIssued(null)}
        >
          For <span className="font-medium text-ink">{issued.account.displayName}</span>,{' '}
          {issued.account.email}. It works once, until {formatDateTime(issued.activationExpiresAt)}{' '}
          Sri Lanka time. Only a hash is kept, so it cannot be shown again; issue a new one if it is
          lost.
        </ShownOnce>
      ) : null}

      <div className="grid gap-xl xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section aria-labelledby="new-inspector" className="grid content-start gap-sm">
          <h2 id="new-inspector" className={panelTitle}>
            New inspector
          </h2>
          <NewInspectorForm districts={districtNames.data ?? []} onCreated={setIssued} />
        </section>

        <section aria-labelledby="accounts-heading" className="grid content-start gap-sm">
          <h2 id="accounts-heading" className={panelTitle}>
            Accounts
          </h2>
          <AccountList districts={districtNames.data ?? []} onLinkIssued={setIssued} />
        </section>
      </div>
    </>
  )
}

function NewInspectorForm({
  districts,
  onCreated,
}: {
  districts: DistrictName[]
  onCreated: (issued: IssuedAccount) => void
}) {
  const create = useCreateInspector()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [national, setNational] = useState(false)
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())

  function toggle(code: string) {
    setChosen((current) => {
      const next = new Set(current)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    create.mutate(
      { displayName, email, districts: national ? ['*'] : [...chosen] },
      {
        onSuccess: (issued) => {
          onCreated(issued)
          setDisplayName('')
          setEmail('')
          setNational(false)
          setChosen(new Set())
        },
      },
    )
  }

  const error = create.error instanceof ApiError ? create.error : null

  return (
    <form onSubmit={submit} className="grid gap-md" noValidate>
      <Field
        label="Name"
        name="displayName"
        autoComplete="off"
        required
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        error={error?.problemWith('displayName')}
      />
      <Field
        label="Email address"
        type="email"
        name="email"
        autoComplete="off"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={error?.problemWith('email')}
      />
      <fieldset className="m-0 grid gap-xs border-0 p-0">
        <legend className={cx(labelSm, caps, 'mb-3xs text-ink-70')}>Districts covered</legend>
        <label className="inline-flex cursor-pointer items-center gap-xs text-body">
          <input
            type="checkbox"
            checked={national}
            onChange={(event) => setNational(event.target.checked)}
            className="m-0 size-[1rem]"
          />
          Every district: a national inspector
        </label>
        {national ? null : (
          <div className="grid max-h-[16rem] grid-cols-2 gap-x-sm gap-y-3xs overflow-y-auto border-y border-y-ink-14 py-xs">
            {districts.map((district) => (
              <label
                key={district.code}
                className="inline-flex cursor-pointer items-center gap-xs text-small"
              >
                <input
                  type="checkbox"
                  checked={chosen.has(district.code)}
                  onChange={() => toggle(district.code)}
                  className="m-0 size-[0.9rem]"
                />
                {district.name}
              </label>
            ))}
          </div>
        )}
        {error?.problemWith('districts') ? (
          <p className="border-l-2 border-l-ink ps-2xs text-small font-medium">
            Districts {error.problemWith('districts')}.
          </p>
        ) : null}
      </fieldset>
      {error && error.fieldProblems.length === 0 ? <FormError>{error.message}</FormError> : null}
      <div>
        <SubmitButton busy={create.isPending}>
          {create.isPending ? 'Creating' : 'Create and get a link'}
        </SubmitButton>
      </div>
    </form>
  )
}

function AccountList({
  districts,
  onLinkIssued,
}: {
  districts: DistrictName[]
  onLinkIssued: (issued: IssuedAccount) => void
}) {
  const accounts = useAccounts()
  return (
    <QueryView
      query={accounts}
      what="accounts"
      loading={<LoadingRows label="Loading accounts" rows={4} />}
      isEmpty={(list) => list.length === 0}
      empty={<EmptyState title="No accounts yet.">Create an inspector to begin.</EmptyState>}
    >
      {(list) => (
        <ul className="border-t border-t-ink">
          {list.map((account) => (
            <li key={account.id}>
              <AccountRow account={account} districts={districts} onLinkIssued={onLinkIssued} />
            </li>
          ))}
        </ul>
      )}
    </QueryView>
  )
}

function AccountRow({
  account,
  districts,
  onLinkIssued,
}: {
  account: AdminAccount
  districts: DistrictName[]
  onLinkIssued: (issued: IssuedAccount) => void
}) {
  const me = useAccount()
  const change = useChangeAccount()
  const newLink = useNewLink()
  const failed = change.error ?? newLink.error

  return (
    <article
      aria-label={account.displayName}
      className="grid gap-2xs border-b border-b-ink-14 py-sm"
    >
      <div className="flex flex-wrap items-baseline gap-x-sm">
        <h3 className="text-body font-medium">{account.displayName}</h3>
        <p className="text-small text-ink-70">{account.email}</p>
      </div>
      <p className="text-small">
        {capitalise(ROLE_NAMES[account.role])} · {covers(account, districts)}
      </p>
      <p className={cx(labelSm, 'text-ink-70')}>{state(account)}</p>
      {account.id === me.id ? (
        <p className={cx(labelSm, 'text-ink-70')}>Your own account</p>
      ) : (
        <div className="flex flex-wrap gap-x-md gap-y-3xs">
          <QuietButton
            onClick={() => change.mutate({ id: account.id, enabled: !account.enabled })}
            disabled={change.isPending}
          >
            {account.enabled ? 'Disable' : 'Enable'}
          </QuietButton>
          {account.enabled ? (
            <QuietButton
              onClick={() => newLink.mutate(account.id, { onSuccess: onLinkIssued })}
              disabled={newLink.isPending}
            >
              {account.activated ? 'New password link' : 'New activation link'}
            </QuietButton>
          ) : null}
        </div>
      )}
      {failed ? (
        <p role="alert" className={cx(labelSm, 'text-ink')}>
          {failed.message}
        </p>
      ) : null}
    </article>
  )
}

function covers(account: AdminAccount, districts: DistrictName[]): string {
  if (account.role === 'DATA_PROVIDER') {
    return account.facilityName ?? account.facilityCode ?? 'no facility'
  }
  if (account.role !== 'PHI') {
    return 'administration'
  }
  if (account.districts.includes('*')) {
    return 'every district'
  }
  const names = new Map(districts.map((district) => [district.code, district.name]))
  return account.districts.map((code) => names.get(code) ?? code).join(', ')
}

function state(account: AdminAccount): string {
  if (!account.enabled) {
    return 'Disabled'
  }
  if (!account.activated) {
    return account.activationExpiresAt
      ? `Not activated · link expires ${formatDateTime(account.activationExpiresAt)}`
      : 'Not activated · no link outstanding'
  }
  return `Active · created ${formatDateTime(account.createdAt)}`
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
