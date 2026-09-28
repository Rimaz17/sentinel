import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/features/landing/LandingPage'
import { PlannedPage } from '@/features/planned/PlannedPage'

/*
 * The dashboard, with Leaflet and the query library, loads only when an
 * inspector opens it. The landing page is the public entry point and is often
 * opened on a low-end phone over mobile data; it should not download a map
 * library it never draws.
 */
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)

function Dashboard() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-gutter text-small text-ink-70">
          Loading the dashboard
        </p>
      }
    >
      <DashboardPage />
    </Suspense>
  )
}

/**
 * The route map from the project plan.
 *
 * The landing page and the internal dashboard are built. Every other route
 * renders a page that says so and names the build phase it belongs to, so a
 * link from the front page is never a dead end and never a mock-up presented
 * as a product.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/dashboard"
        element={
          <PlannedPage title="The public dashboard" phase="Phase 4 · Accounts and roles">
            <p>
              District-level status across all 25 districts, disease trends and historical data, and
              alerts that a public health inspector has confirmed for publication.
            </p>
            <p>
              Geography here is shown as shaded district polygons or a heatmap, never individual
              report positions, because a point at a pharmacy’s exact coordinates can reveal which
              household got sick.
            </p>
          </PlannedPage>
        }
      />

      <Route
        path="/signin"
        element={
          <PlannedPage title="Sign in" phase="Phase 4 · Accounts and roles">
            <p>
              One sign-in for both staff roles: healthcare data providers submitting reports on
              behalf of a facility, and public health inspectors working the internal dashboard.
            </p>
            <p>
              Inspector accounts are created by a system administrator and there is no sign-up route
              for them. An inspector without an account should contact their district administrator
              to request access.
            </p>
          </PlannedPage>
        }
      />

      <Route
        path="/register"
        element={
          <PlannedPage title="Facility registration" phase="Phase 4 · Accounts and roles">
            <p>
              Registration for healthcare data providers. It requires the invite code issued to your
              facility, which is validated on the server; without a valid code an account cannot be
              created at all.
            </p>
            <p>
              The gate exists because a data provider account feeds reports straight into the
              detector. Open registration would let anyone invent a clinic and either trigger false
              alerts or bury a real signal in noise.
            </p>
          </PlannedPage>
        }
      />

      <Route
        path="/submit"
        element={
          <PlannedPage title="Submit a report" phase="Phase 4 · Accounts and roles">
            <p>
              The submission form for healthcare data providers. Identity fields are stripped by the
              ingestion API before anything is stored, and the facility the report belongs to is
              read from your session rather than from the form.
            </p>
          </PlannedPage>
        }
      />

      <Route path="/app" element={<Dashboard />} />
      <Route path="/app/districts/:code" element={<Dashboard />} />

      <Route
        path="/app/admin/*"
        element={
          <PlannedPage title="Administration" phase="Phase 4 · Accounts and roles">
            <p>
              The facility registry, facility invite codes, and inspector accounts. Inspector
              accounts are created here by a system administrator; there is no sign-up for them.
            </p>
          </PlannedPage>
        }
      />

      <Route
        path="*"
        element={
          <PlannedPage title="That page does not exist." phase="Unknown route">
            <p>
              The address you followed does not match anything in Sentinel. If you arrived from a
              link on this site, it is a mistake worth reporting.
            </p>
          </PlannedPage>
        }
      />
    </Routes>
  )
}
