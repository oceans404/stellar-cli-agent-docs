---
description: How the Stellar CLI is put together, where it keeps state, how read and write paths differ, and how an agent connects to it.
keywords: [Stellar, CLI, architecture, simulation, signing, local state, MCP, skills]
---

# Architecture

The CLI is a single static binary that talks directly to a Stellar RPC endpoint. There is no
account, no session, no server component, and no vendor in the request path. Your agent runs the same
binary you run.

That shape explains most of the CLI's strengths and its one significant weakness. Because nothing sits
between the agent and the network, composition is easy and nothing can refuse a transaction on your
behalf. See [Authority model](authority-model.md).

**Skill:** the [Stellar CLI skill package](../skills.md) is the instruction layer this page's
"Agent integration" section describes.

## Local state

| Path | Holds |
|---|---|
| `~/.config/stellar/identity/<NAME>.toml` | One identity per file: a seed phrase, a secret key, or a public key for watch-only |
| `~/.config/stellar/network/<NAME>.toml` | One network per file: RPC URL and passphrase |
| `~/.config/stellar/config.toml` | Defaults set by `stellar network use` and `stellar keys use` |
| OS keychain | Seed phrases for identities created with `--secure-store` |
| Platform data directory | Simulation and transaction cache, managed by `stellar cache` |

Run `stellar doctor` to print the resolved config and data directory paths for your platform, which
differ across macOS, Linux, and Windows. Override the config location with `--config-dir` or
`XDG_CONFIG_HOME`.

Identity files are plaintext unless you created the identity with `--secure-store`. Treat the
directory as secret material.

`stellar network use` and `stellar keys use` write to `config.toml` machine-wide. The change is not
scoped to a shell session, a project directory, or your agent's process. Anyone else's session on
the same machine picks up the new default the next time they omit `--network` or `--source`. On a
shared machine, this is invasive in a way that is easy to miss, because the command that sets it
gives no such warning.

## Configuration precedence

Flags beat environment variables, which beat saved defaults. Every network, RPC, signing, and fee
value has a `STELLAR_*` environment variable, so an agent can be configured entirely through its
environment with no files written. This is the non-invasive alternative to `network use`/`keys use`
on a shared machine: it takes precedence over the saved default, and it affects only the process
that set it.

```bash
export STELLAR_NETWORK=testnet
export STELLAR_ACCOUNT=agent-1
export STELLAR_NO_CACHE=true
```

`stellar env` prints what the CLI resolved, with secret-bearing values concealed. Pass `--reveal` to
print them.

Below flags, environment variables, and saved defaults sits one more layer `stellar env` does not
report: on a config directory with nothing set, `stellar network` commands still resolve to
`testnet`, confirmed by a matching ledger ID and sequence between a fresh config directory and an
explicit `--network testnet`. `stellar env` on that same fresh config prints
`⚠️  No defaults or environment variables set`, which is accurate about defaults and environment
variables and silent about this fallback. Omitting `--network` does not fail; it silently succeeds
against testnet. That is safe today, but it is an accident of the current fallback, not a
guarantee. The moment anyone runs `stellar network use mainnet` on that machine, the same omission
resolves to mainnet instead. Pass `--network` explicitly regardless of what the fallback happens to
be right now.

## Invocation model

Every run is a one-shot argv parse. There is no REPL and no persistent session. The closest thing to
interactivity is `stellar tx edit`, which opens a single transaction envelope in `$EDITOR`.

This suits an agent well. Each command is independent, idempotent to plan, and carries its full
context in its arguments, so there is no session state for the agent to lose track of.

## Read path

Reads are simulations. The CLI sends the call to RPC, the network evaluates it without committing
anything, and the result comes back. No source account, no signature, no fee, and no funded account
are required.

```bash
stellar token decimals --id <CODE:ISSUER> --network mainnet
```

Reads need no key, no funded account, and no signing, which makes them the cheapest way to check
your setup, on testnet, from a fresh install with no keys configured. Mainnet needs one extra step
first: the built-in `mainnet` network entry is a placeholder, not a real RPC endpoint, so a fresh
install cannot reach mainnet until you add a real one:

```bash
stellar network add mainnet --rpc-url <YOUR_MAINNET_RPC_URL> \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

Stellar's [RPC providers page](https://developers.stellar.org/docs/data/apis/rpc/providers) has the full list, and the public
`https://mainnet.sorobanrpc.com` needs no signup.

See [Supported networks](supported-networks.md) for why. Reads are the right smoke test when
something is misconfigured, and an agent can safely identify an unknown asset before it holds any,
on any network that actually has an RPC endpoint configured.

## Write path

A mutating command runs five stages: simulate, sign any Soroban authorization entries, sign the
transaction envelope, submit, then poll for the result.

Non-root Soroban authorization entries prompt for approval during the second stage. `--auto-sign`
suppresses that prompt. Nothing else in the pipeline prompts.

Since 28.0.0, an on-chain failure surfaces the diagnostic events rather than only the host error
code, so a failure reads as `"trustline entry is missing for account"` instead of only
`Error(Contract, #13)`. That difference matters when an agent has to decide what to do next.

## Composition

Three properties make the CLI pipeable, and together they are its most distinctive feature.

`--build-only` on most mutating commands stops before signing and submitting, and prints unsigned
base64 XDR to stdout. It still needs RPC: it reads the source account's sequence number from the
network, so it needs a reachable network and a funded source account. What it does not do is sign
or submit. The `stellar token` family is the exception: `token transfer` and `token approve` have
no `--build-only` flag at all. Use `stellar tx new payment --build-only` in their place when a
build-only handoff is what you need for moving value.

Every `tx` subcommand reads XDR from stdin when given no positional argument. `stellar tx sign` and
`stellar tx hash` need no RPC connection at all, and they are the only genuinely offline stages in
this pipeline.

```bash
stellar tx new payment --source agent-1 --destination <ADDRESS> --amount 10000000 --build-only --network testnet \
  | stellar tx sign --sign-with-key agent-1 --network testnet \
  | stellar tx send --network testnet
```

Pass `--network` at the sign stage explicitly. A transaction's signature commits to the network
passphrase, so signing without it falls back to whatever network happens to be your saved default.
That produces a valid-looking envelope that fails on submission with `TxBadAuth` if the default was
the wrong network.

Splitting that pipeline across machines gives you air-gapped signing, but only the middle stage is
actually air-gapped: build on a networked machine, sign on an offline one, submit from a networked
machine again. The signing key never touches a networked machine, which is the real security
property here, not the whole pipeline being network-free. Splitting the pipeline across people
instead gives you a review step.

## Token resolution

`--id` on every `stellar token` command accepts four forms, resolved by one shared resolver:

- `native` for XLM
- `CODE:ISSUER` for a classic asset
- a `C…` contract address
- a saved contract alias

The first two resolve to a Stellar Asset Contract, so you never look up a contract ID by hand. If the
Stellar Asset Contract for a classic asset has not been deployed, the CLI reports
`sac_not_deployed` and names `stellar contract asset deploy` as the fix.

## Contract interface generation

`stellar contract invoke --id <CONTRACT> -- --help` reads the contract's own schema from the network
and generates a typed CLI for it on the fly. Everything after `--` is parsed by that generated CLI,
including per-argument help.

```bash
stellar contract invoke --id <CONTRACT> --source agent-1 --network testnet -- --help
stellar contract invoke --id <CONTRACT> --source agent-1 --network testnet -- <FUNCTION> --help
```

An agent can therefore discover a contract's callable surface without an ABI file, a binding
package, or any prior knowledge of the contract.

## Agent integration

The CLI ships no agent glue. Three separate pieces cover that ground, and none of them is required.

**Raven** is Stellar's hosted MCP server at `https://raven.stellar.buzz/mcp`. It exposes
documentation search, an ecosystem graph, and community content, under the `stellarDocs`, `scout`,
and `lumenloop` namespaces. It is a research server. It holds no keys and cannot sign or submit
anything. Every connection path ends in a browser sign-in.

**Stellar Skills** are installable skill packages covering Soroban contracts and agent payments.
They are documentation delivered as a skill rather than a driver for the CLI. The
[Stellar CLI skill package](../skills.md) that ships with these docs is the driver: workflows and
command references written to constrain an agent operating the binary.

**`AGENTS.md`** is generated by `stellar contract init` as of 28.0.0. It gives a coding agent the
build and test commands for the scaffolded workspace. It is aimed at agents writing contracts, not
at agents moving funds.

The [Stellar CLI skill package](../skills.md) is that instruction layer, written against this
documentation set. It pins itself to a build with `cliVersion` in its frontmatter, though nothing
verifies that pin for you: `stellar doctor` reports the binary, not what a skill expects of it, so
an agent has to probe a subcommand to tell a main build from a release build.

## Related pages

- [Authority model](authority-model.md)
- [Output and errors](output-and-errors.md)
- [Commands reference](commands.md)
- [Build and submit transactions](../guides/build-and-submit-transactions.md)
