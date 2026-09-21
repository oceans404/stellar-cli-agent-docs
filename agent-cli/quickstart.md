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

`--version` tells you which build you have. Both report `28.0.0`, but the commit hash is printed
alongside it and the two differ:

```bash
~/.stellar-main/bin/stellar --version    # stellar 28.0.0 (f1adb979...)  main
stellar --version                        # stellar 28.0.0 (300aaf69...)  release
```

If you do not know which hash is which, ask for a subcommand only the main build has:

```bash
~/.stellar-main/bin/stellar token decimals --help
```

That prints help on a main build and `error: unrecognized subcommand 'decimals'` on the release,
exit code 2.

This matters more than it looks. Bare `stellar` resolves to whatever is on your PATH, which is the
release install on most machines, and release behavior looks correct for everything except those
five subcommands. The absence of an error is not evidence you ran the build you meant to.
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

### Give the agent the CLI's conventions

A main build has `stellar skill`, which prints a short Markdown guide to the CLI's own conventions.
Feed it to your agent alongside the MCP server:

```bash
~/.stellar-main/bin/stellar skill > stellar-cli-skill.md
```

It covers `network use`, `keys use`, contract aliases, `--send=no` for reads, and the
stdout-versus-stderr split. It does not cover the `stellar token` family, `tx new`, message signing,
or anything about spend authority, so it is a starting point and not the whole briefing. The
[Stellar CLI skill package](skills.md) covers the rest. It exits `2` on a release install.

## Step 3: Create a key for your agent

Give the agent its own identity rather than sharing yours. This is the cheapest bound you can put on
it, because the most an agent can lose is what its own account holds.

```bash
stellar keys generate agent-1 --network testnet --fund
```

Pass `--fund` or the account is created locally but never funded on the network. The first command
that needs it then fails with `Error(Contract, #6)`, `"account entry is missing"`, which names
neither funding nor `--fund`. The words `trustline`, `trust`, and `fund` do not appear in that error
at all. Fix it with `stellar keys fund <NAME> --network testnet`.

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

This step is for you at the terminal, not for your agent. `stellar network use` and `stellar keys
use` write the default machine-wide, not per project and not per shell, so every other repository on
this machine picks it up.

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

An agent should skip this step and keep passing `--network` explicitly on every command, along
with whichever source flag that command takes, because it cannot see what a previous session saved.

Not every command takes `--source`. The `tx` family and `stellar keys` do. `stellar token transfer`
names its source `--from` and rejects `--source`. Check `--help` before you script a command.

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

```text
Send 1 XLM from agent-1 to agent-2 on testnet, then show me the new balance.
```

The commands it should run, using the address `stellar keys address agent-2` printed:

```bash
stellar token transfer --id native --from agent-1 --to <ADDRESS> --amount 10000000 --network testnet
stellar token balance --id native --account agent-1 --network testnet --decimal
```

`--amount` is in the token's smallest unit, so `10000000` is 1 XLM at 7 decimals. Never assume 7.
Read it with `~/.stellar-main/bin/stellar token decimals --id <TOKEN>`. `token decimals` is one
of the five subcommands that need the main build, so call it by its full path.

An `--amount` below the smallest unit is not rejected. `--amount 1` submits 0.0000001 XLM and exits
0, so a missing multiplier looks like a success.

The balance line above is what catches that, so read it rather than just running it. After a 1 XLM
transfer `agent-1` should fall by 1 XLM plus the fee. If it fell by a fraction of a stroop instead,
the transfer went through with the wrong amount. `tx fetch result` will not tell you: it reports
`tx_success` and the same fee for both, and carries no amount, source, or destination.

`token transfer` routes through the Stellar Asset Contract and pays Soroban resource fees on top of
the base fee, so it costs roughly a hundred times the classic equivalent and accepts no fee flag at
all. On testnet a native transfer measured 13745 stroops against 100 for `tx new payment`. Treat
that as an order of magnitude, not a constant: the figure depends on how many ledger entries the
transfer touches, and measured values on the same testnet asset ranged from 9519 to 14352 depending
only on who the counterparty was. It is
taught here because one command covers XLM and every other token identically. When you need a capped
fee, or an unsigned envelope, use the classic path instead, which takes `--inclusion-fee`:

```bash
stellar tx new payment --source agent-1 --destination <ADDRESS> --amount 10000000 \
  --network testnet --inclusion-fee 200
```

## Step 7: Verify what your agent did

In text mode a submitted transfer prints its hash as the last line of stdout, and again on the
stderr line `ℹ️  Signing transaction: <HASH>`. With `--output json` the hash is in stdout's `tx_hash`
and nowhere else, because JSON mode writes zero bytes to stderr on success and failure alike.
`tx fetch result` takes the hash as `--hash`, not a positional argument:

```bash
TX=$(stellar token transfer --id native --from agent-1 --to <ADDRESS> --amount 10000000 --network testnet)
stellar tx fetch result --hash "$TX" --network testnet
```

**An empty `$TX` does not mean the transfer failed.** On a `transaction submission timeout` the
transaction has already reached the network, stdout can carry zero bytes, and the exit code is 1,
which is byte-identical to a clean failure and is not one. Never retry a timed-out write. Confirm
on-chain state first: re-read both balances, take the hash from the stderr signing line, and if you
have no hash at all, find it through Horizon. Only retry once `tx fetch result` comes back
"not found".

A line starting with `❌` that names a cause (`TxBadAuth`, `TxBadSeq`, a rejected simulation) is a
real failure and is safe to retry.

For machine-readable output on either command, add `--output json`. Coverage is not uniform across
the CLI, and only the `stellar token` family returns typed errors. See
[Output and errors](reference/output-and-errors.md) before you build error handling.

## Next steps

- [Send tokens](guides/send-tokens.md)
- [Delegate spending](guides/delegate-spending.md)
- [Authority model](reference/authority-model.md)
- [Commands reference](reference/commands.md)
