# IntentGate Console

[![CI](https://github.com/NetGnarus/intentgate-console/actions/workflows/ci.yml/badge.svg)](https://github.com/NetGnarus/intentgate-console/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

Operator UI for the [IntentGate authorization gateway](https://github.com/NetGnarus/intentgate-gateway) — token management, audit log viewer, policy editor.

This is the open-source single-tenant console (Apache 2.0). A commercial enterprise console with OIDC/SSO + RBAC + multi-tenant features lives in a separate private repo.

## Companion repositories

| Repo | Purpose |
| ---- | ------- |
| [intentgate-gateway](https://github.com/NetGnarus/intentgate-gateway) | Go gateway with the four-check pipeline. The console talks to its admin API. |
| [intentgate-extractor](https://github.com/NetGnarus/intentgate-extractor) | Optional FastAPI service for intent extraction. |
| [intentgate-sdk-python](https://github.com/NetGnarus/intentgate-sdk-python) | Python SDK that agents use to call the gateway. |
| [intentgate-helm](https://github.com/NetGnarus/intentgate-helm) | Helm chart for Kubernetes deployment. |
| [intentgate-console](https://github.com/NetGnarus/intentgate-console) | This repo. |

## What's in v0.1

- **Dashboard** — gateway health pill, list of currently revoked tokens, structured error panels for misconfiguration.

The console is intentionally minimal in v0.1. Future sessions add token management (mint + revoke forms), audit log viewer, and Rego policy editor. See the roadmap below.

## Quick start

Requires Node.js 20+.

```sh
git clone https://github.com/NetGnarus/intentgate-console.git
cd intentgate-console
npm install
cp .env.example .env.local
# edit .env.local with your gateway URL + admin token
npm run dev
```

The console listens on `http://localhost:3000`.

You'll need a gateway running with `INTENTGATE_ADMIN_TOKEN` set. Quickest local-dev path:

```sh
# In the gateway repo:
export INTENTGATE_ADMIN_TOKEN="$(openssl rand -hex 32)"
INTENTGATE_METRICS_ENABLED=true ./bin/gateway
```

Then put the same `INTENTGATE_ADMIN_TOKEN` value into the console's `.env.local`.

## Configuration

Two server-only environment variables (never exposed to the browser):

| Env var | Required | Description |
| ------- | -------- | ----------- |
| `INTENTGATE_GATEWAY_URL` | yes | Base URL of the gateway, e.g. `http://localhost:8080`. |
| `INTENTGATE_ADMIN_TOKEN` | yes | Must match the gateway's `INTENTGATE_ADMIN_TOKEN`. |

Both are read server-side. The browser only sees rendered HTML; the admin token never leaves Node.

## Project layout

```
app/
  layout.tsx        # root layout, metadata, fonts
  page.tsx          # dashboard (server component, fetches on every request)
  globals.css       # Tailwind v4 entry
lib/
  config.ts         # server-only env-var loader (cached)
  gateway.ts        # server-only gateway client + GatewayError
  types.ts          # shared types mirroring the gateway's admin API
.github/workflows/  # CI: lint + typecheck + build
```

## Develop

```sh
npm run dev         # Next.js dev server on :3000
npm run lint        # ESLint
npm run build       # production build
```

## Architecture

Every page is a Next.js server component that fetches gateway data on every request via `lib/gateway.ts`. The admin token lives on the server, attached as a Bearer token to outbound requests. The browser only ever sees rendered HTML.

When we add interactive actions (revoke, mint), they go through Next.js Server Actions or API routes — same boundary, same secret.

## Roadmap

- [x] Dashboard with gateway health + revocations list
- [ ] Revoke action (form + Server Action)
- [ ] Mint UI (form for `igctl mint` equivalent)
- [ ] Audit log viewer (depends on audit-event Postgres persistence in the gateway)
- [ ] Rego policy editor with dry-run preview
- [ ] OIDC/SSO + RBAC (commercial overlay; open repo stays static-token only)

## Contributing

Apache 2.0 and welcomes community contributions. Open an issue to discuss any non-trivial change before sending a PR.

## Security

If you find a security vulnerability, please **do not** open a public issue. Email security@intentgate.app or open a GitHub Security Advisory on this repo.
