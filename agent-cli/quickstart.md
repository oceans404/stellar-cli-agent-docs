---
description: Install the stellar CLI, connect it to your agent, fund a testnet key, and make your first agent-driven transfer.
keywords: [Stellar, agent, quickstart, CLI, testnet, stellar token, CI, secure store]
---

# Quickstart

**Skill:** `workflows/onboarding.md` and `references/keys.md` in the
[Stellar CLI skill package](skills.md) are the agent-facing version of this page.

## Before you start

You need a terminal on macOS, Linux, WSL, or Windows, and an AI agent that supports MCP servers or
skills (Claude Code, Codex, Cursor, VS Code, or similar). The CLI is a single static binary and
needs no runtime. Contract development additionally needs Rust and the `wasm32v1-none` target, but
nothing on this page does.

Do this on testnet. Every command below targets testnet, and testnet funds are free from friendbot.
Move to mainnet after you have watched your agent work.

## Step 1: Install the CLI

Build from `main`. Five of the seven `stellar token` subcommands these docs use (`name`, `symbol`,
`decimals`, `approve`, and `allowance`) are merged but not in the 28.0.0 release, so a release
install cannot run them. There is no prebuilt main binary: GitHub publishes only tagged releases,
crates.io has no prereleases, and `install.sh` resolves the latest release with no way to ask for a
branch.

Before you run the install, have all four of these:

| Prerequisite | Check with | Needs to be |
|---|---|---|
| Rust toolchain | `rustc --version` | 1.93.0 or later |
| Cargo | `cargo --version` | ships with Rust |
| Git | `git --version` | any recent version |
| Build time | | roughly 5 to 15 minutes from cold |

Rust 1.93.0 is a hard floor. The repository pins it in `rust-toolchain.toml`, but that pin only
applies inside a checkout, so `cargo install` uses whatever your default toolchain is. Check it
yourself rather than assuming the pin protects you. Install or update with
`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`, then `rustup update stable`.

```bash
cargo install --locked --git https://github.com/stellar/stellar-cli --branch main stellar-cli \
  --root ~/.stellar-main
```

`--branch main` is not optional. Without it, cargo can resolve the default branch from its cached
git database in `~/.cargo/git/db/` instead of fetching, and install a much older commit while still
exiting successfully. We hit exactly this: the command without `--branch main` installed 23.1.3 from
September 2025 and reported success.

`--root ~/.stellar-main` keeps the build out of `~/.cargo/bin`, where it would be named `stellar`
and shadow, or be shadowed by, your release install depending on PATH order.

Verify with a subcommand, not with `--version`. A main build and a release build both report
`28.0.0` and differ only in the commit hash, so the version string cannot tell you which one you
are running:

```bash
~/.stellar-main/bin/stellar token decimals --help
```

That prints help on a main build and `error: unrecognized subcommand 'decimals'` on the release.
Call the main build by its full path in the steps that need it, and keep `stellar` pointing at the
release for everything else.

### Release installs

Use these once the five subcommands ship, or now if you only need `token transfer`, `token balance`,
and the `tx` family. Pin an explicit version in CI, because Homebrew and the install script both
track latest, which makes a green build today a red build tomorrow. There is no official npm
package.

| Method | Command |
|---|---|
| Homebrew | `brew install stellar-cli` |
| Install script | `curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh \| sh` |
| winget | `winget install --id Stellar.StellarCLI --version 28.0.0` |
| Cargo | `cargo install --locked stellar-cli@28.0.0` |
| Docker | `docker run --rm -it -v "$(pwd)":/source stellar/stellar-cli:28.0.0 version` |
| GitHub Actions | `- uses: stellar/stellar-cli@v28.0.0` |

### Check the environment

```bash
stellar doctor
```

`stellar doctor` is the triage command for everything that follows. It reports your CLI version,
Rust toolchain and `wasm32v1-none` target, wasm optimizer availability, whether your OS secure store
and any Ledger device are usable, whether a container engine is present, your config and data
directory paths, your XDR version, and the reachability and protocol version of every configured
network. It does not check account funding, API keys, or contract health. Run it first whenever
something later fails.

## Step 2: Connect your agent

Add the Raven MCP server so your agent can search Stellar's documentation and ecosystem while it
works. Raven is a research server. It reads docs and ecosystem data and cannot sign or submit
anything.

Claude Code:

```bash
claude mcp add --transport http stellar-raven "https://raven.stellar.buzz/mcp"
```

Codex:

```bash
codex mcp add stellar-raven --url "https://raven.stellar.buzz/mcp"
codex mcp login stellar-raven
```

VS Code:

```bash
code --add-mcp '{"name":"stellar-raven","type":"http","url":"https://raven.stellar.buzz/mcp"}'
```

Every path ends in a browser sign-in. Raven is not an anonymous endpoint.

## Step 3: Create a key for your agent

Give the agent its own identity rather than sharing yours. This is the cheapest bound you can put on
it, because the most an agent can lose is what its own account holds.

```bash
stellar keys generate agent-1 --network testnet --fund
```

Pass `--fund` or the account is created locally but never funded on the network, and later commands
fail with a trustline error that does not mention funding.

Check the address and balance:

```bash
stellar keys address agent-1
stellar token balance --id native --account agent-1 --network testnet --decimal
```

### Where the key is stored

Without `--secure-store`, identities are written in plaintext to
`~/.config/stellar/identity/<NAME>.toml`. Add the flag to keep the seed phrase in your OS keychain
instead:

```bash
stellar keys generate agent-1 --network testnet --fund --secure-store
```

Secure store supports seed phrases only, not raw secret keys.

A `--secure-store` identity's `.toml` file holds no key material, only `entry_name` and
`public_key`. The seed phrase itself lives in the OS keychain, and the CLI needs this file's pointer
to reach it. The file looks harmless because it contains nothing secret, which is exactly what makes
it dangerous: deleting it does not delete the key, but it does strand the account, since the CLI can
no longer find where the key lives. Remove a secure-store identity with
`stellar keys rm <NAME> --force`, which purges both the file and the keychain entry, never by
deleting the file by hand. If you have already deleted the file, recreate it with the same
`entry_name` and `public_key` and the CLI can sign again.

There is no `stellar keys rename`. To rename an identity, move its file in
`~/.config/stellar/identity/` and confirm with `stellar keys address` that the public key is
unchanged.

### Hardware and watch-only identities

For a hardware-backed identity:

```bash
stellar keys add agent-1 --ledger
```

For a watch-only identity that can read but never sign:

```bash
stellar keys add treasury --public-key <ADDRESS>
```

## Step 4: Choose how your agent holds funds

Pick one. This is the decision that determines your exposure.

- **Own key.** The agent holds `agent-1` and spends from it directly. Simple, and bounded only by
  that account's balance. Use it on testnet and for small mainnet amounts.
- **Allowance.** You keep funds in an account the agent does not control, and grant `agent-1` a
  capped, expiring allowance with `stellar token approve`. The network enforces the cap. Use it when
  the funding account holds more than you want at risk.

[Delegate spending](guides/delegate-spending.md) walks through the allowance path, including the
extra `contract invoke` step needed to actually spend it. `stellar token` has no command that draws
on an allowance by itself. [Authority model](reference/authority-model.md) explains what neither
option protects you from.

## Step 5: Set your defaults

This step is for you at the terminal, not for your agent.

```bash
stellar network use testnet
stellar keys use agent-1
```

Every command that takes `--network` or `--source` now falls back to these. Confirm what the CLI
will use, with secret-bearing values concealed:

```bash
stellar env
```

Pass `--reveal` to print secrets. The flag was added in 27.0.0, which is also the first release
where concealment is dependable. See [Troubleshooting](troubleshooting.md) if you are on an older
install.

An agent should skip this step and keep passing `--network` and `--source` explicitly on every
command, because it cannot see what a previous session saved, and `stellar network use` writes that
default machine-wide rather than per project or per shell.

In CI, prefer environment variables over saved defaults, because they are explicit in the job
definition:

```bash
export STELLAR_NETWORK=testnet
export STELLAR_ACCOUNT=agent-1
export STELLAR_NO_CACHE=true
```

## Step 6: Make your first transfer

You need a destination. Create a second identity so you have a real address to send to:

```bash
stellar keys generate agent-2 --network testnet --fund
stellar keys address agent-2
```

Ask your agent:

```
Send 1 XLM from agent-1 to agent-2 on testnet, then show me the new balance.
```

The commands it should run, using the address `stellar keys address agent-2` printed:

```bash
stellar token transfer --id native --from agent-1 --to <ADDRESS> --amount 10000000 --network testnet
stellar token balance --id native --account agent-1 --network testnet --decimal
```

`--amount` is in the token's smallest unit, so `10000000` is 1 XLM at 7 decimals. Never assume 7.
Read it with `stellar token decimals --id <TOKEN>`.

## Step 7: Verify what your agent did

Every submitted transfer prints its hash on the last line of stdout, so your agent can capture it.
`tx fetch result` takes the hash as `--hash`, not a positional argument:

```bash
TX=$(stellar token transfer --id native --from agent-1 --to <ADDRESS> --amount 10000000 --network testnet)
stellar tx fetch result --hash "$TX" --network testnet
```

For machine-readable output on either command, add `--output json`. Coverage is not uniform across
the CLI, and only the `stellar token` family returns typed errors. See
[Output and errors](reference/output-and-errors.md) before you build error handling.

## Next steps

- [Send tokens](guides/send-tokens.md)
- [Delegate spending](guides/delegate-spending.md)
- [Authority model](reference/authority-model.md)
- [Commands reference](reference/commands.md)
