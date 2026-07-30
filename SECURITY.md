# Security policy

`doc` is experimental and does not yet publish versioned security support windows.

The initial foundation intentionally remains on the Next.js 14 / React 18 line while the product is
being separated from its legacy deployment assumptions. Remaining upstream audit findings that
require a Next.js 16 / React 19 and Auth.js migration are tracked as release blockers for any public
stable release.

Do not open a public issue for a suspected vulnerability. Report it privately through the
fullstack-ai-infra organization security contact or a GitHub private vulnerability report once
enabled for this repository.

Include the affected surface, reproduction steps, expected impact, and any mitigation you already
tested. Never include production tokens, private documents, personal data, or live credentials.

Self-hosters are responsible for rotating the secrets in `.env.example`, restricting PostgreSQL and
the collaboration service to trusted networks, and using TLS at the deployment edge.
