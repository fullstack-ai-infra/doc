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
```

Remote commands use scoped personal access tokens and the stable `/api/v1/documents` surface. Local
stack commands continue to operate on a discovered or explicitly selected checkout.

See the
[CLI guide](https://github.com/fullstack-ai-infra/doc/blob/main/docs/CLI.md)
for the complete command and safety contract.
