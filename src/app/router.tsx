import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { AppHeader } from './shell/AppHeader';
import { BottomNav } from './shell/BottomNav';
import { SideNav } from './shell/SideNav';
import { SyncBanner } from './shell/SyncBanner';
import { useHasRailNav } from '@ui/primitives';
import { QuickFindScreen } from './routes/quickfind';
import { OperationsScreen } from './routes/operations';
import { InventoryScreen } from './routes/inventory';
import { CommandScreen } from './routes/command';
import {
  SettingsLayout,
  SettingsIndex,
  AccountPage,
  AppearancePage,
  DepartmentPage,
  AdministrationPage,
  HelpReferencePage,
} from './routes/settings';
import { GalleryScreen } from './routes/gallery';
import { AuthRoute } from './routes/auth';
import { CreateDepartmentRoute } from './routes/create-department';
import { JoinDepartmentRoute } from './routes/join-department';
import { HelpRoute } from './routes/help';
import { UserManagerScreen, AuditLogScreen } from '@ui/admin';
import { EmptyState } from '@ui/primitives';
import { OnboardingHost } from '@ui/onboarding';
import { RequireDepartment } from '@ui/dept';

/**
 * Route tree — the locked 5-tab spine (ADR-014) + the /gallery dev surface,
 * wrapped in a pathless `shell` layout so the pre-shell /auth route (workflow
 * 06) can mount OUTSIDE the chrome (no header, no bottom nav). Code-based
 * routes; nav transitions are plain renders (no animation — 00-ia-foundation.md).
 */

// Bare root — renders only the matched child, so /auth fills the screen.
function RootBare() {
  return <Outlet />;
}

// The tab shell. Phone/tablet-portrait: header + sync banner + scroll pane +
// fixed bottom nav, stacked in a column. Desktop (≥1024, useHasRailNav): a left
// SideNav rail beside the content column (the bottom nav is hidden — the rail is
// the primary nav). The content stays wrapped in .fs-shell-col so the column
// internals (header/banner/main) are identical on both surfaces.
function RootLayout() {
  const rail = useHasRailNav();
  return (
    <div className={rail ? 'fs-shell fs-shell--rail' : 'fs-shell'}>
      {rail && <SideNav />}
      <div className="fs-shell-col">
        {/* Desktop: the rail carries the brand, so the top command-header is
            dropped and that height goes to content; each screen owns its heading.
            Phone keeps the header (its title bar). */}
        {!rail && <AppHeader />}
        <SyncBanner />
        <main className="fs-shell-main">
          <Outlet />
        </main>
        {!rail && <BottomNav />}
      </div>
      {/* First-run tour — renders only when active (account-creation or a Settings
          replay); mounted here so it survives tab changes and overlays the chrome. */}
      <OnboardingHost />
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootBare });

// Pathless layout route — every tab renders inside the shell; /auth does not.
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: RootLayout,
});

// Settings is a layout route (master/detail, B): the rail/list navigates between
// its sub-pages; the detail pane is the routed <Outlet/>. RequireDepartment wraps
// the layout once, so every sub-page inherits the gate.
const settingsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings',
  component: () => (
    <RequireDepartment>
      <SettingsLayout />
    </RequireDepartment>
  ),
});

const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([
    // Cold open lands on Operations — the working screen, not the calculator
    // (Phase H gate kick-back, #248). Quick Find lives at /quickfind.
    createRoute({
      getParentRoute: () => shellRoute,
      path: '/',
      beforeLoad: () => {
        throw redirect({ to: '/operations' });
      },
    }),
    // Quick Find is OPEN to everyone (stateless calculator, no department data).
    createRoute({ getParentRoute: () => shellRoute, path: '/quickfind', component: QuickFindScreen }),
    // The dept-scoped + account tabs are gated: a signed-in member with no department
    // sees the set-up gate instead (RequireDepartment). Guests pass through.
    createRoute({ getParentRoute: () => shellRoute, path: '/operations', component: () => <RequireDepartment><OperationsScreen /></RequireDepartment> }),
    createRoute({ getParentRoute: () => shellRoute, path: '/inventory', component: () => <RequireDepartment><InventoryScreen /></RequireDepartment> }),
    createRoute({ getParentRoute: () => shellRoute, path: '/command', component: () => <RequireDepartment><CommandScreen /></RequireDepartment> }),
    settingsRoute.addChildren([
      // Index: desktop forwards to Account (rail carries the nav); phone shows the page list.
      createRoute({ getParentRoute: () => settingsRoute, path: '/', component: SettingsIndex }),
      createRoute({ getParentRoute: () => settingsRoute, path: 'account', component: AccountPage }),
      createRoute({ getParentRoute: () => settingsRoute, path: 'appearance', component: AppearancePage }),
      createRoute({ getParentRoute: () => settingsRoute, path: 'department', component: DepartmentPage }),
      createRoute({ getParentRoute: () => settingsRoute, path: 'administration', component: AdministrationPage }),
      createRoute({ getParentRoute: () => settingsRoute, path: 'help', component: HelpReferencePage }),
    ]),
    // The Admin-gated User Manager (#381) — reached from the Settings Administration gateway.
    // RequireDepartment gates the dept; the screen itself backstops the manageUsers permission
    // (a direct /users nav by a non-admin shows the access-only state).
    createRoute({ getParentRoute: () => shellRoute, path: '/users', component: () => <RequireDepartment><UserManagerScreen /></RequireDepartment> }),
    // The Audit Log (#211) — reached from the Settings Administration gateway. RequireDepartment
    // gates the dept; the screen itself backstops the per-view gates (Incident = IC/Operations
    // position; Administrative = manageUsers) and shows the command-record state to neither.
    createRoute({ getParentRoute: () => shellRoute, path: '/audit-log', component: () => <RequireDepartment><AuditLogScreen /></RequireDepartment> }),
    createRoute({ getParentRoute: () => shellRoute, path: '/help', component: HelpRoute }),
    createRoute({ getParentRoute: () => shellRoute, path: '/gallery', component: GalleryScreen }),
  ]),
  // Pre-shell, chrome-free — direct children of root, not the shell. /auth is
  // workflow 06; /create-department is workflow 07 (reached forward from sign-in
  // or Settings, never a cold-open gate — ADR-015).
  createRoute({ getParentRoute: () => rootRoute, path: '/auth', component: AuthRoute }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/create-department',
    component: CreateDepartmentRoute,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/join-department',
    component: JoinDepartmentRoute,
  }),
]);

// A render throw inside a route shows a recoverable screen instead of a blank
// page; an unknown path points back to Operations (audit W6). The App-root
// ErrorBoundary backstops anything outside the router.
function RouteError({ error }: { error: Error }) {
  return (
    <EmptyState
      variant="upstream-blocked"
      headline="Something went wrong on this screen"
      reason={error instanceof Error ? error.message : 'An unexpected error occurred'}
      action={{ label: 'Reload', onPress: () => window.location.reload() }}
    />
  );
}

function RouteNotFound() {
  return (
    <EmptyState
      variant="filtered"
      headline="Screen not found"
      reason="That view doesn't exist — head back to Operations"
      action={{ label: 'Go to Operations', onPress: () => window.location.assign('/operations') }}
    />
  );
}

export const router = createRouter({
  routeTree,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: RouteNotFound,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
