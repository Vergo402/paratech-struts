import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { AppHeader } from './shell/AppHeader';
import { BottomNav } from './shell/BottomNav';
import { QuickFindScreen } from './routes/quickfind';
import { OperationsScreen } from './routes/operations';
import { InventoryScreen } from './routes/inventory';
import { CommandScreen } from './routes/command';
import { SettingsScreen } from './routes/settings';
import { GalleryScreen } from './routes/gallery';

/**
 * Route tree — the locked 5-tab spine (ADR-014) + the /gallery dev surface.
 * Code-based routes; nav transitions are plain renders (no animation —
 * 00-ia-foundation.md). Screens are stubs until S4–S6 fill them in.
 */
function RootLayout() {
  return (
    <div className="fs-shell">
      <AppHeader />
      <main className="fs-shell-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const routeTree = rootRoute.addChildren([
  // Cold open lands on Operations — the working screen, not the calculator
  // (Phase H gate kick-back, #248). Quick Find lives at /quickfind.
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    beforeLoad: () => {
      throw redirect({ to: '/operations' });
    },
  }),
  createRoute({ getParentRoute: () => rootRoute, path: '/quickfind', component: QuickFindScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/operations', component: OperationsScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/inventory', component: InventoryScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/command', component: CommandScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsScreen }),
  createRoute({ getParentRoute: () => rootRoute, path: '/gallery', component: GalleryScreen }),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
