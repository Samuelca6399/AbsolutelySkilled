# Framework-specific source code patterns

When analyzing a user's codebase, use these patterns to quickly find routes, components, and testable elements.

## Next.js (App Router)

- Routes: `app/` directory - each `page.tsx` is a route, directory structure = URL path
- Components: co-located in `app/` or shared in `components/`
- API routes: `app/api/` directory - each `route.ts` is an endpoint
- data-testid: look in client components (`"use client"` directive) - server components may not have testids
- Layout: `layout.tsx` files for shared UI (navbars, sidebars)

## Next.js (Pages Router)

- Routes: `pages/` directory - each file is a route
- Global layout: `_app.tsx`
- API routes: `pages/api/`
- Components: typically in `components/` directory

## React SPA (CRA / Vite)

- Routes: defined in router config, usually React Router
- Look for route definitions in `App.tsx`, `routes.tsx`, or `router.tsx`
- Single entry point with client-side routing
- Components: `src/components/` or feature-based directories

## Vue

- Routes: `router/index.ts` or `router/index.js`
- Components: `components/` or `views/` directories
- Look for `data-testid` or `data-test` attributes (Vue convention)
- Templates in `.vue` single-file components

## Generic HTML / MPA

- Each HTML file is a page
- Look for `<a href>` for navigation paths
- Forms are usually the critical flows to monitor
- Check for data-testid attributes in any framework
