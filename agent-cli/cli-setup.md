---
description: Complete Stellar CLI setup for an agent command by command, for a terminal, a CI job, or an agent with no skills installed.
keywords: [Stellar, CLI, setup, agent, CI, testnet, identity]
---

# CLI setup

The same path as [Quickstart](quickstart.md), written as commands with no agent in the loop. Use
this page when you are automating in CI, or when your agent has no skills or MCP server installed
and needs a complete reference it can follow.

**Skill:** `workflows/onboarding.md` and `references/keys.md` in the [Stellar CLI skill package](skills.md) is the agent-facing version
of this page.

## Prerequisites

A terminal on macOS, Linux, WSL, or Windows. Nothing else. The CLI is a single static binary and
needs no runtime.

Contract development additionally needs Rust 1.84 or later and the `wasm32v1-none` target. Nothing
on this page requires either.

## 1. Install the CLI

Homebrew (macOS, Linux, WSL):

```bash
brew install stellar-cli
```

Install script (macOS, Linux, WSL):

```bash
curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh
```

winget (Windows):

```bash
winget install --id Stellar.StellarCLI --version 28.0.0
```

Cargo, from source:

```bash
cargo install --locked stellar-cli@28.0.0
```

Docker:

```bash
docker run --rm -it -v "$(pwd)":/source stellar/stellar-cli:28.0.0 version
```

GitHub Actions:

```yaml
- uses: stellar/stellar-cli@v28.0.0
```

Pin an explicit version in CI. Homebrew and the install script both track latest, which makes a
green build today a red build tomorrow.

There is no official npm package for the CLI.

## 2. Verify the environment

```bash
stellar --version
stellar doctor
```

`stellar doctor` is the triage command for everything that follows. It reports your CLI version,
your Rust toolchain and `wasm32v1-none` target, wasm optimizer availability, whether your OS secure
store and any Ledger device are usable, whether a container engine is present, your config and data
directory paths, your XDR version, and the reachability and protocol version of every configured
network.

It does not check account funding, API keys, or contract health.

## 3. Create an identity

```bash
stellar keys generate agent-1 --network testnet --fund
```

`--fund` calls friendbot. Without it the key is saved locally and the account does not exist on the
network, and the first command that needs the account fails with a trustline error that does not
mention funding.

To keep the seed phrase in your OS keychain rather than a plaintext file:

```bash
stellar keys generate agent-1 --network testnet --fund --secure-store
```

Secure store supports seed phrases only, not raw secret keys. Without it, identities are written to
`~/.config/stellar/identity/<NAME>.toml`.

A `--secure-store` identity's `.toml` file holds no key material, only `entry_name` and
`public_key`. The seed phrase itself lives in the OS keychain, and the CLI needs this file's pointer
to reach it. The file looks harmless because it contains nothing secret, which is exactly what makes
it dangerous: deleting it does not delete the key, but it does strand the account, since the CLI can
no longer find where the key lives. Remove a secure-store identity with
`stellar keys rm <NAME> --force`, which purges both the file and the keychain entry, never by
deleting the file by hand. If you have already deleted the file, recreate it with the same
`entry_name` and `public_key` and the CLI can sign again.

For a hardware-backed identity:

```bash
stellar keys add agent-1 --ledger
```

For a watch-only identity that can read but never sign:

```bash
stellar keys add treasury --public-key <ADDRESS>
```

Confirm and inspect:

```bash
stellar keys ls
stellar keys address agent-1
```

There is no `stellar keys rename`. To rename an identity, move its file in
`~/.config/stellar/identity/` and confirm with `stellar keys address` that the public key is
unchanged.

## 4. Set defaults

```bash
stellar network use testnet
stellar keys use agent-1
```

Every command that takes `--network` or `--source` now falls back to these. Print the resolved
configuration, with secret-bearing values concealed:

```bash
stellar env
```

Pass `--reveal` to print secrets. The flag was added in 27.0.0, which is also the first release
where concealment is dependable. See [Troubleshooting](troubleshooting.md) if you are on an older
install.

In CI, prefer environment variables over saved defaults, because they are explicit in the job
definition:

```bash
export STELLAR_NETWORK=testnet
export STELLAR_ACCOUNT=agent-1
export STELLAR_NO_CACHE=true
```

## 5. Read before you write

Reads are simulations. They need no source account, no key, and no funded account, so run them first
as a smoke test:

```bash
stellar token balance --id native --account agent-1 --network testnet --decimal
stellar token symbol --id <CODE:ISSUER> --network testnet
stellar token decimals --id <CODE:ISSUER> --network testnet
```

## 6. Send a transfer

```bash
stellar token transfer \
  --id native \
  --from agent-1 \
  --to <ADDRESS> \
  --amount 10000000 \
  --network testnet
```

`--amount` is in the token's smallest unit. Read the scale with `stellar token decimals` rather than
assuming 7.

For a non-native asset, the destination needs a trustline first:

```bash
stellar tx new change-trust --source <DESTINATION_IDENTITY> --line <CODE:ISSUER> --network testnet
```

## 7. Make output machine-readable

```bash
stellar --quiet token balance --id native --account agent-1 --network testnet --output json
```

`--quiet` suppresses informational logging on stderr. `--output json` gives a single-line object on
stdout. Together they give you output you can pipe into a parser without filtering.

Coverage is not uniform across the CLI, and only the `stellar token` family returns typed errors.
See [Output and errors](reference/output-and-errors.md) before you build error handling.

## 8. Build without submitting

Add `--build-only` to any `tx new <OPERATION>` or `contract` command to stop before signing and
submitting:

```bash
stellar tx new payment --source agent-1 --destination <ADDRESS> --amount 10000000 --build-only
```

`token transfer` and `token approve` do not accept `--build-only` at all. For a build-only payment
handoff, use `stellar tx new payment --build-only` as above, not `token transfer`.

`--build-only` still contacts RPC to read the source account's sequence number, so it needs network
access and a funded source account. What it skips is signing and submitting, which is what makes it
safe to let an agent prepare work a human approves. See
[Build and submit transactions](guides/build-and-submit-transactions.md).

## Next steps

- [Authority model](reference/authority-model.md)
- [Commands reference](reference/commands.md)
- [Troubleshooting](troubleshooting.md)
