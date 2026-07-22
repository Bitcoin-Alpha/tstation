# tstation

Command-line client for the [Turing Station](https://turingstation.nl) public API.

Works without an account for publicly visible content. With an API key from your
Turing Station account settings, it unlocks the content your membership includes.

## Usage

No install needed:

```bash
npx @label21/tstation posts list
```

Or install globally to get the `tstation` command:

```bash
npm install -g @label21/tstation
```

## Commands

```bash
tstation posts list                        # list posts
tstation posts list --tags podcast         # filter by tag slugs
tstation posts list --search "obsidian"    # search
tstation posts list --limit 5 --featured true
tstation posts get <id-or-slug>            # read a post
tstation posts get <id-or-slug> --formats plaintext,lexical
tstation posts tags                        # list available tags

tstation auth login                        # verify and store an API key
tstation auth status                       # show active key and source
tstation auth logout                       # remove the stored key
```

Every command accepts `--json` for raw API output, which makes the CLI easy to
compose with `jq` or feed to other tools:

```bash
tstation posts list --json | jq '.items[].slug'
```

Paginate with the cursor printed at the end of a page:

```bash
tstation posts list --cursor '<next_cursor from previous page>'
```

## Authentication

Create an API key at [turingstation.nl/settings](https://turingstation.nl/settings), then:

```bash
tstation auth login
```

Paste the key at the prompt — input is hidden, so nothing appears while you
type. The key is verified against the API and stored in
`~/.config/tstation/config.json` (mode 0600). Alternatively, set
`TSTATION_API_KEY` in the environment or pass `--api-key` per invocation;
those take precedence over the stored key, in that order: flag, environment,
config file.

`TSTATION_API_URL` / `--api-url` override the API base URL
(default `https://api.turingstation.nl`).

## How it works

The CLI is generated from the public OpenAPI spec at
[docs.turingstation.nl/content/openapi-public.json](https://docs.turingstation.nl/content/openapi-public.json).
The spec is vendored in [`api/openapi-public.json`](api/openapi-public.json),
types are generated with [openapi-typescript](https://github.com/openapi-ts/openapi-typescript),
and requests go through [openapi-fetch](https://github.com/openapi-ts/openapi-typescript/tree/main/packages/openapi-fetch),
so the commands are type-checked against the live API contract. A weekly
workflow re-fetches the spec and opens a PR when it changes.

Prefer a generic OpenAPI client? The same spec works directly with
[Restish](https://rest.sh).

## Development

```bash
pnpm install
pnpm generate    # regenerate src/generated/ from the vendored spec
pnpm typecheck
pnpm build       # bundle to dist/cli.js
node dist/cli.js posts list
```

Releases: push a `v*` tag; CI publishes to npm with provenance.

## License

[MIT](LICENSE)
