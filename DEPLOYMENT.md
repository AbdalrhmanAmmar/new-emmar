# Deploy to Vercel

1. Commit and push the deployment files, including `package-lock.json`, to GitHub.
2. Import `AbdalrhmanAmmar/new-emmar` into Vercel.
3. Select `main` as the Production Branch in the project's production environment settings.
4. Use the repository root as the Root Directory and **TanStack Start** as the Framework Preset.
5. The repository config sets Install Command to `npm ci`, Build Command to `npm run build`, and Node.js to `22.x`. Leave the Output Directory override disabled: Nitro generates the Vercel Build Output API files in `.vercel/output`.
6. Deploy, then check `/login` and refresh a nested route such as `/sales/invoices`.

No environment variables are required by the current demo app. Do not add a catch-all rewrite to `/index.html`: Nitro handles server rendering and routing.

## Verify locally

```bash
npm ci
npm run build
```

The build should produce `.vercel/output/config.json`, static assets, and a server function.

## Current data storage

The current app uses a mock database stored in the browser's localStorage and browser-side login checks. Each browser and domain has separate data; existing localhost data will not automatically appear on the Vercel domain. Hosting does not add a shared database or server-side authentication. Connect those before using this demo for shared business data.

Reference: [TanStack Start on Vercel](https://vercel.com/docs/frameworks/full-stack/tanstack-start).
