---
description: Install the stellar CLI, connect it to your agent, fund a testnet key, and make your first agent-driven transfer.
keywords: [Stellar, agent, quickstart, CLI, testnet, stellar token]
---

# Quickstart

**Skill:** `workflows/onboarding.md` in the [Stellar CLI skill package](skills.md) is the agent-facing version
of this page.

## Before you start

You need a terminal and an AI agent that supports MCP servers or skills (Claude Code, Codex, Cursor,
VS Code, or similar).

Do this on testnet. Every command below targets testnet, and testnet funds are free from friendbot.
Move to mainnet after you have watched your agent work.

## Step 1: Install the CLI

{/*
HIDDEN 2026-09-10. Release-install paths are commented out while the quickstart points at a main
build, because `token name`, `symbol`, `decimals`, `approve`, and `allowance` are not in 28.0.0.
Restore this block when those subcommands ship in a tagged release, and cut the section below.

macOS, Linux, or WSL:

```bash
brew install stellar-cli
```

Or without Homebrew:

```bash
curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh
```

Windows:

```bash
winget install --id Stellar.StellarCLI
```

Confirm the install and check your environment:

```bash
stellar --version
stellar doctor
```

`stellar doctor` reports your CLI version, your Rust toolchain, whether your OS keychain and any
Ledger device are available, and which configured networks are reachable. Run it first whenever
something later fails.
*/}

### Build from main

Build the CLI from `main`. There is no prebuilt main binary: GitHub publishes only tagged releases,
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
fail with a trustline error that does not mention funding. To store the seed phrase in your OS
keychain instead of a file, add `--secure-store`.

Check the address and balance:

```bash
stellar keys address agent-1
stellar token balance --id native --account agent-1 --network testnet --decimal
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

Save the network and identity so your agent does not have to pass them on every command:

```bash
stellar network use testnet
stellar keys use agent-1
```

Confirm what the CLI will now use, with secrets concealed:

```bash
stellar env
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

For machine-readable output on either command, add `--output json`.

## Next steps

- [Send tokens](guides/send-tokens.md)
- [Delegate spending](guides/delegate-spending.md)
- [Authority model](reference/authority-model.md)
- [CLI setup](cli-setup.md)
