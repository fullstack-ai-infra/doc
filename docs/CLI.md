# doc CLI

`doc` is the local operations interface for a self-hosted checkout. Version `0.1` manages
configuration and runtime infrastructure; it does not bypass the product API to mutate documents.

## Install

From the repository:

```bash
npm ci
npm install --global ./packages/cli
doc --help
```

For repository-local use without a global install:

```bash
npm run doc -- --help
```

The CLI requires Node.js 24. Commands discover the nearest `doc` checkout by walking upward from
the current directory. Use `--root <path>` to select one explicitly.

## Quick start

```bash
doc init
doc doctor
doc up --build
doc doctor --live
doc status
```

Open <http://localhost:3000>.

`doc init` writes `.env` and `services/collaboration/.env` with mode `0600`. It creates independent
random values for:

- `AUTH_SECRET`
- `COLLABORATE_API_AUTH_KEY`
- `COLLABORATE_INTERNAL_API_KEY`

Secret values are never printed. Existing files are kept unless both `--force` and `--yes` are
present. Forced initialization preserves non-secret configuration and rotates all three generated
secrets.

## Command surface

| Command                                        | Purpose                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `doc capabilities [--json]`                    | Print the delivered/experimental capability inventory                      |
| `doc init [--dry-run] [--force --yes]`         | Create, or explicitly rotate, private environment files                    |
| `doc doctor [--live] [--json]`                 | Validate dependencies, configuration, Compose, and optional live endpoints |
| `doc up [service...] [--build] [--foreground]` | Start the full stack or selected services                                  |
| `doc down`                                     | Stop the stack without deleting PostgreSQL data                            |
| `doc status [--json]`                          | Inspect services in this checkout's isolated Compose project               |
| `doc logs [service] [-f] [--tail N]`           | Read service logs                                                          |
| `doc dev [--skip-infra]`                       | Start local dependencies, apply the development schema, and run Next.js    |
| `doc db generate`                              | Generate the Prisma client                                                 |
| `doc db push`                                  | Explicitly push schema to a loopback-only development database             |
| `doc check`                                    | Run the repository quality gate                                            |
| `doc config path`                              | Print the selected environment path without reading values                 |
| `doc version [--json]`                         | Print CLI, project, and Node versions                                      |

Global options:

```text
--root <path>       Explicit checkout
--env-file <path>   Selected environment file; init only writes relative .env* paths in the checkout
--json              Machine-readable output where supported
```

Configuration precedence is shell environment, then the selected environment file, then template
defaults. Diagnostics report the source of configured values without printing them.

`doc init` creates a private `.doc/instance-id`. The stable identity follows a moved checkout and
prevents separate clones from controlling each other's Compose containers. `down`, `status`, and
`logs` remain usable if the runtime environment file is missing or damaged.

## Safety contract

- Child processes use argument arrays with `shell: false`.
- `doc down` never deletes volumes.
- `doc dev` and `doc db push` refuse non-loopback database hosts and never add
  `--accept-data-loss`.
- Diagnostics redact secrets and do not source the environment file as shell code.
- Exit code `0` is success, `1` is an operation/check failure, `2` is invalid usage or
  configuration, and `5` means a required executable is unavailable.

## Deferred document commands

Commands such as `doc ls`, `doc get`, `doc create`, `doc update`, `doc versions`, `doc publish`,
and workspace import/export are intentionally deferred. They require:

1. A scoped, revocable PAT model.
2. A canonical session/Bearer principal.
3. A versioned `/api/v1` with correct HTTP error semantics.
4. Permission fixes and end-to-end tests.
5. A versioned bundle format that preserves JSON, Yjs binary state, and snapshots.
