# @fullstack-ai-infra/doc-cli

Authenticated document and local operations CLI for
[`doc`](https://github.com/fullstack-ai-infra/doc).

```bash
npm install --global ./packages/cli
doc auth login --url https://docs.example.com
doc ls
doc create --title "Agent notes"

doc init
doc doctor
doc up --build
doc doctor --live
npm run verify:local-loop
```

The default local Web endpoint is <http://localhost:3100>; Mailpit captures zero-credential email
sign-in links at <http://localhost:8025>. Host ports are parameterized in the generated `.env`.
`doc init` safely merges newly added non-secret defaults into existing local environments, and the
local-loop verifier exercises Mailpit login plus document persistence without exposing auth data.

Remote commands use scoped personal access tokens and the stable `/api/v1/documents` surface. Local
stack commands continue to operate on a discovered or explicitly selected checkout.

See the
[CLI guide](https://github.com/fullstack-ai-infra/doc/blob/main/docs/CLI.md)
for the complete command and safety contract.
