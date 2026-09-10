---
description: Start with stellar doctor, then fix funding, trustline, network, and signing errors your agent will hit with the stellar CLI.
keywords: [Stellar, agent, troubleshooting, stellar doctor, stellar CLI, errors]
---

# Troubleshooting

**Skill:** `workflows/troubleshooting.md` in the [Stellar CLI skill package](skills.md) is the agent-facing version
of this page.

## Start with `stellar doctor`

Run this before debugging anything else:

```bash
stellar doctor
```

`stellar doctor` checks: your CLI version against the latest release, your local Rust toolchain and
whether the `wasm32v1-none` target is installed, whether a wasm optimizer is available, whether an
OS secure store (Keychain, Secure Store Service, or *nix keyutils/Secret Service) is available,
whether Ledger hardware wallet support is available, whether a container engine (`docker` or
`apple-container`) is available, your config and data directory locations, the CLI's XDR schema
version, and the reachability plus protocol and RPC version of every network configured in
`stellar network ls`.

A real run looks like this:

```
✅ You are using the latest version of Stellar CLI: 28.0.0
ℹ️  Rust version: 1.93.0
✅ Rust target `wasm32v1-none` is installed
✅ Wasm optimization
✅ Secure store (OS keyring)
✅ Ledger hardware wallet
✅ Container engine `docker` is available
⚙️  Config directory: <PATH>
📁 Data directory: <PATH>
ℹ️  XDR version: <HASH>
⚠️  Default network "local" (http://localhost:8000/rpc) is unreachable
🌎 Default network "futurenet" (...) protocol 28, rpc 28.0.0-...
🌎 Default network "testnet" (...) protocol 28, rpc 28.0.1-...
🌎 Network "mainnet" (...) protocol 27, rpc 27.1.1-...
```

`stellar doctor` does not check account funding, API keys or rate limits, or contract-level health.
It is a toolchain and environment diagnostic, not an account or contract diagnostic. A green
`stellar doctor` run does not mean your agent's key is funded or that a contract call will succeed.
For those, see the entries below.

## A submit appears to fail, but the funds moved

Read this before you write any retry logic. It is the most important entry on this page.

`stellar tx send` writes an informational line to stderr (`ℹ️  Transaction hash is <HASH>`; the
equivalent line from `token transfer` reads `ℹ️  Signing transaction: <HASH>`) and its
JSON receipt to stdout, separately:

```console
$ … | stellar tx send --network testnet 2>/dev/null
{"status":"SUCCESS", …}

$ … | stellar tx send --network testnet 2>&1
ℹ️  Transaction hash is d9a2ae81f886c9b5cde637a282424eb1a8eb88c741aee5857a744cd29994ba…
{"status":"SUCCESS", …}
```

Cause: merging stderr into stdout with `2>&1`, the default habit of most agent tooling, interleaves
the two streams and breaks the JSON. A parser sees the stderr line prepended to the JSON object and
raises a decode error. An agent that treats that parse failure as a submit failure, and retries,
has just resubmitted a transaction that already succeeded. This is a confirmed double-spend, not a
hypothetical one.

Fix: never merge stderr into stdout when you intend to parse the result. Redirect stderr
separately, and capture it rather than discarding it, since the hash you need to confirm on-chain
state lives on that stderr line:

```bash
stellar tx send --network <NET> 2>send.stderr
```

Before retrying any submit that appears to have failed, confirm it did not already land. A failed
parse is not evidence the transaction failed:

```bash
stellar tx fetch result --hash <HASH> --network <NET>
```

Only retry once you have confirmed the transaction is not already on-chain.

## Payments and balances

### `TxInsufficientBalance`

```
❌ error: transaction submission failed: TxInsufficientBalance
```

The source account cannot cover the transaction's base fee, currently 100 stroops. This happens on
accounts that hold roughly zero XLM, which is common for a newly generated key whose only balance is
a sponsored reserve. A sponsored reserve covers the account's minimum balance requirement. It does
not cover fees.

Fix: send the account a small amount of XLM.

```bash
stellar token transfer --id native --from <FUNDED_IDENTITY> --to <AGENT_IDENTITY> --amount 10000000 --network testnet
```

### `Error(Contract, #13)`, `"trustline entry is missing for account"`

```
HostError: Error(Contract, #13)

Event log (newest first):
   0: [Diagnostic Event] … data:["trustline entry is missing for account", <ADDRESS>]
```

This is the classic-asset error: a `CODE:ISSUER` token, or its Stellar Asset Contract. Two distinct
causes produce this same message, and the text does not say which one you have:

- The destination account exists but has no trustline for this asset.
- The destination account does not exist on the network at all. A classic-asset query returns
  `#13` in this case too, so this code alone does not tell you which one you have.

Fix, for a missing trustline:

```bash
stellar tx new change-trust --source <NAME> --line <CODE:ISSUER> --network testnet
```

Fix, for an account that does not exist:

```bash
stellar keys fund <NAME> --network testnet
```

### `Error(Contract, #6)`, `"account entry is missing"`

```
HostError: Error(Contract, #6)

Event log (newest first):
   0: [Diagnostic Event] … data:["account entry is missing", <ADDRESS>]
```

This is the native-asset (XLM) version of the same underlying problem: the destination account does
not exist on the network. It is what you get after `stellar keys generate <NAME> --network testnet`
without `--fund`. The key is saved locally, but the account does not exist on-chain until something
funds it.

Do not confuse this with `#13` above. A classic asset reports a missing account as a missing
trustline (`#13`), because trustlines are asset-specific sub-entries of an account. The native
asset has no trustline concept, so the same underlying problem, an account that does not exist,
reports as `#6` instead.

Fix:

```bash
stellar keys fund <NAME> --network testnet
```

## Assets and contracts

### `sac_not_deployed`

```json
{"error":{"type":"sac_not_deployed","message":"..."}}
```

The Stellar Asset Contract for this classic asset has not been deployed on the target network yet.
`stellar token` commands need the SAC to exist before they can call it.

Fix, the CLI's own suggested command:

```bash
stellar contract asset deploy --asset <ASSET> --source-account <IDENTITY> --network testnet
```

`--source-account` is required on `contract asset deploy`. Omitting it fails with a usage error, so
if you copy the hint from the error message alone, add an identity before running it.

## Messages

### `unexpected argument '--message' found` on `stellar message sign`

The message is a positional argument, not a flag. There is no `--message` flag on `stellar message
sign` or `stellar message verify`.

Fix: drop the flag.

```bash
stellar message sign "<MESSAGE>" --sign-with-key <NAME>
```

## Accounts

### Account merge refused

```bash
stellar tx new account-merge --source <NAME> --account <DESTINATION> --network testnet
```

fails under two distinct network-level conditions:

- `ACCOUNT_MERGE_HAS_SUB_ENTRIES`: the source account still has subentries such as trustlines,
  offers, or data entries. Signers do not block a merge and are removed automatically.
- `ACCOUNT_MERGE_IS_SPONSOR`: the account's `num_sponsoring` is greater than zero. The account is
  currently sponsoring reserves for other ledger entries.

Fix for subentries: close trustlines first.

```bash
stellar tx new change-trust --source <NAME> --line <CODE:ISSUER> --limit 0 --network testnet
```

Repeat for every open trustline and offer. Sponsorship of entries owned by accounts you do not
control cannot be cleared from your side. You need the sponsored account's cooperation, or you
cannot merge until that sponsorship ends.

## Networks

### `Invalid URL Bring Your Own` on mainnet

```
❌ error: Invalid URL Bring Your Own: https://developers.stellar.org/docs/data/rpc/rpc-providers
```

A fresh install's built-in `mainnet` network entry is a placeholder, not a real RPC endpoint.
`stellar network ls --long` shows it as `RPC url: Bring Your Own: <that same docs link>`. Any
command against `mainnet` fails this way until you add a real endpoint. `testnet`, `futurenet`, and
`local` are unaffected; only `mainnet` ships without one.

Fix:

```bash
stellar network add mainnet --rpc-url <YOUR_MAINNET_RPC_URL> \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

Pick an endpoint from Stellar's [RPC providers page](https://developers.stellar.org/docs/data/apis/rpc/providers), or use the public
`https://mainnet.sorobanrpc.com` if you want one without a signup.

### Default network unreachable

```
⚠️  Default network "local" (http://localhost:8000/rpc) is unreachable
```

`local` points at a container that is not running. `stellar doctor` reports this with a warning
glyph rather than failing.

Fix, start the container:

```bash
stellar container start local
```

Or switch to a network that is already reachable:

```bash
stellar network use testnet
```

### `TxBadAuth` after signing

```
❌ error: transaction submission failed: TxBadAuth
```

A signature commits to the network passphrase it was made under. `stellar tx sign` falls back to
your saved default network's passphrase whenever you omit `--network` or `--network-passphrase`. If
that default does not match the network you submit to, the envelope looks valid but fails on
submission with `TxBadAuth`. Hashing the same unsigned envelope with no network flags and with the
default network's passphrase produces the same hash; hashing it with a different passphrase produces
a different one, which is how to confirm this is the cause.

Fix: pass `--network` explicitly at the sign stage, every time.

```bash
stellar tx sign --sign-with-key <NAME> --network <NET>
```

## Soroban contract calls

### Simulation failures

`contract invoke` and every `tx new` command run simulation before signing. A failed simulation
reports the contract's own error code (for example `Error(Contract, #13)` above) rather than a
generic CLI failure.

`--auth-mode {enforce,root,non-root}` controls how strictly the simulation checks Soroban
authorization entries. Use `--auth-mode enforce` (the default) to catch missing or malformed auth
before you sign anything. Use `--auth-mode non-root` while iterating on a contract call whose
nested authorization you have not wired up yet, so simulation does not block on it.

Since `stellar-cli` 28.0.0, the CLI surfaces the diagnostic events attached to a failed on-chain
transaction, not just a failed simulation. Read the `Event log` block in the error message from the
newest entry down. The first `[Diagnostic Event]` line is almost always the actual cause.

## Environment and secrets

### Secrets appearing or not appearing in `stellar env`

```bash
stellar env
```

Secret-bearing values (secret keys, RPC headers, signing keys) are concealed by default, shown as
`# KEY=<concealed>`.

The version history here matters if you are auditing an older install. The concealment machinery
existed in 26.0.0, but an inverted check meant secrets could still print in plain text. `stellar-cli`
27.0.0 fixed that check and added the `--reveal` flag, which does not exist in 26.0.0. Treat 27.0.0
as the first release where concealment is actually dependable.

To display a concealed value, pass `--reveal`:

```bash
stellar env --reveal
```

Concealed variables print nothing at all unless `--reveal` is passed, so a script checking for the
presence of a key by grepping `stellar env` output must pass `--reveal` or it will see only the
placeholder.

### `Secure Store does not reveal secret key`

```
❌ error: Secure Store does not reveal secret key
```

An identity created with `--secure-store` only supports seed phrases, and the CLI refuses to export
the raw secret from one. This surfaces whenever something outside the CLI needs the raw secret
string, for example a JavaScript library that takes a private key directly.

Fix: that key cannot be exported. Create a separate, file-backed identity for any flow that needs
the raw secret, and keep it out of `--secure-store`.

```bash
stellar keys generate <NAME> --network testnet --fund
stellar keys secret <NAME>
```

## Related pages

- [Output and errors](reference/output-and-errors.md)
- [Quickstart](quickstart.md)
- [Authority model](reference/authority-model.md)
