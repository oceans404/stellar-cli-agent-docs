---
description: Complete reference for every stellar CLI command, its flags, and whether it reads or mutates state.
keywords: [Stellar, CLI, reference, commands, stellar token, stellar tx, stellar contract]
---

# Commands reference

Every command below was run with `--help` against `stellar` 28.0.0 on the local machine. Two builds
were probed: the 28.0.0 release, and a build from `main`.
Where they differ, the row says so. Flags shared by many commands (global, RPC, transaction, and
signing options) are documented once in their own sections and referenced from each command family
rather than repeated per command.

Each command is marked one of:

- **Read-only**: touches no state. Safe to run at any time.
- **Mutates local config**: writes to `~/.config/stellar/` or the local cache. Reversible by
  editing or deleting that file.
- **Submits a transaction**: signs and sends to the network. Not reversible by the CLI. Most
  commands in this category accept `--build-only`, which prints unsigned XDR and submits nothing.
  The `stellar token` family is the exception: `token transfer` and `token approve` have no
  `--build-only` flag at all. See [`stellar token`](#stellar-token) below.

**Skill:** `references/token.md`, `references/transactions.md`, `references/keys.md`, and `references/contracts.md` in the [Stellar CLI skill package](../skills.md) is the agent-facing version
of this page.

## Global flags

Every command accepts these.

| Flag | Required | Description |
|---|---|---|
| `--config-dir <CONFIG_DIR>` | No | Location of the config directory. Defaults to `$XDG_CONFIG_HOME/stellar`, falling back to `~/.config/stellar`. |
| `-f, --filter-logs <FILTER_LOGS>` | No | Filters log output. Turn a target on with `stellar_cli::log::footprint=debug` or off with `=off`. Also settable with the `RUST_LOG` env var. |
| `-q, --quiet` | No | Suppresses stderr logging, including `INFO` lines. |
| `-v, --verbose` | No | Logs `DEBUG` events. |
| `--very-verbose` | No | Logs `DEBUG` and `TRACE` events. Alias `--vv`. |
| `--no-cache` | No | Disables the local simulation and transaction cache for this run. Env `STELLAR_NO_CACHE`. |
| `-h, --help` | No | Prints help for the current command. |
| `-V, --version` | No | Prints the CLI version. Root command only. |

## RPC options

Present on any command that talks to an RPC endpoint.

| Flag | Required | Description |
|---|---|---|
| `--rpc-url <RPC_URL>` | No | RPC server endpoint. Env `STELLAR_RPC_URL`. |
| `--rpc-header <RPC_HEADERS>` | No | An RPC header to send, for example `"X-API-Key: abc123"`. Repeatable for multiple headers. Env `STELLAR_RPC_HEADERS`. |
| `--network-passphrase <NETWORK_PASSPHRASE>` | No | Network passphrase used to sign the transaction sent to the RPC server. Env `STELLAR_NETWORK_PASSPHRASE`. |
| `-n, --network <NETWORK>` | No | Name of a configured network to use. Env `STELLAR_NETWORK`. |

`--network` resolves against networks added with `stellar network add`. See
[Supported networks](supported-networks.md) for the built-in set and how resolution order works.

## Transaction options

Present on the `stellar tx` family: `tx new <OPERATION>`, `tx operation add <OPERATION>`, and the
commands that submit them.

They are **not** present on `stellar token` writes. `token transfer` and `token approve` build and
submit a transaction and accept none of these flags, so their fee cannot be capped and they have no
`--build-only`. A `stellar token` write routes through the Stellar Asset Contract and costs a
roughly a hundred times the 100-stroop classic default, so the uncappable fee is also the larger
one. The exact figure varies with the ledger entries touched rather than with the asset, so do not
budget from a single quoted number. Where you need a fee ceiling or an unsigned envelope, use `stellar tx new payment`
instead.

| Flag | Required | Description |
|---|---|---|
| `-s, --source-account <SOURCE_ACCOUNT>` | Required, but see below | Alias `--source`. Accepts an identity (`--source agent-1`), a public key (`--source <ADDRESS>`), a muxed account (`--source <MUXED_ADDRESS>`), a secret key, or a seed phrase. Also signs the final transaction unless `--build-only` is passed, in which case signing with a bare public key fails. Env `STELLAR_ACCOUNT`. |
| `--fee <FEE>` | No | Deprecated. Use `--inclusion-fee`. Fee in stroops. Env `STELLAR_FEE`. |
| `--inclusion-fee <INCLUSION_FEE>` | No | Maximum fee for transaction inclusion, in stroops. Defaults to `100` if no flag, env var, or saved default is set. Env `STELLAR_INCLUSION_FEE`. |
| `--build-only` | No | Builds the transaction and writes unsigned base64 XDR to stdout. Submits nothing. |

**`--source-account` is required and can be satisfied without you typing it.** The requirement is met
by `[defaults] identity` in `~/.config/stellar/config.toml`, or by `STELLAR_ACCOUNT`, so a command
that names no source still runs and originates from whatever that resolves to. `--help` prints the
resolved value, as in `[env: STELLAR_ACCOUNT=alice]`, which reads like documentation and is a live
binding. Measured: `contract deploy`, `contract invoke --send yes`, and `contract asset deploy` all
proceed with no source named. `tx operation add` does not, and leaves the operation source null to
inherit the transaction source.

Run `stellar env` before any write to see what you would be spending from, and pass `--source`
explicitly in anything scripted.

## Signing options

Present on any command with a final signing step.

| Flag | Required | Description |
|---|---|---|
| `--sign-with-key <SIGN_WITH_KEY>` | No | Identity, secret key, or seed phrase to sign with. If a seed phrase, `--hd-path` defaults to `0`. Env `STELLAR_SIGN_WITH_KEY`. |
| `--hd-path <HD_PATH>` | No | HD derivation index used when signing with a seed phrase, for example `m/44'/148'/{hd_path}`. Default `0`. |
| `--sign-with-lab` | No | Signs through `https://lab.stellar.org`. Env `STELLAR_SIGN_WITH_LAB`. |
| `--sign-with-ledger` | No | Signs with a connected Ledger hardware wallet. Env `STELLAR_SIGN_WITH_LEDGER`. |
| `--auto-sign` | No | Signs without prompting for approval. |

`--auto-sign` is the CLI's only approval-gate concept. Its help text scopes it precisely: it
applies only to signatures that require user approval, such as non-root Soroban authorization
entries. By default, those entries prompt for approval during signing. `--auto-sign` suppresses
that prompt. It does not add a confirmation step anywhere else. Ordinary payments, trustline
changes, and token transfers never prompt, with or without `--auto-sign`.

Soroban simulation commands (`contract deploy`, `contract upload`, `contract invoke`, `contract
extend`, `contract restore`) additionally accept `--resource-fee <RESOURCE_FEE>` (env
`STELLAR_RESOURCE_FEE`), `--instruction-leeway <INSTRUCTION_LEEWAY>`, `--cost` (prints execution
cost to stderr), and `--auth-mode <enforce|root|non-root>` (env `STELLAR_AUTH_MODE`).

## Environment variables

| Variable | Description |
|---|---|
| `STELLAR_ACCOUNT` | Default for `--source-account`. |
| `STELLAR_OPERATION_SOURCE_ACCOUNT` | Default for `--operation-source-account` on `stellar tx operation add`. |
| `STELLAR_NETWORK` | Default for `--network`. |
| `STELLAR_RPC_URL` | Default for `--rpc-url`. |
| `STELLAR_RPC_HEADERS` | Default for `--rpc-header`. |
| `STELLAR_NETWORK_PASSPHRASE` | Default for `--network-passphrase`. |
| `STELLAR_FEE` | Default for the deprecated `--fee`. |
| `STELLAR_INCLUSION_FEE` | Default for `--inclusion-fee`. |
| `STELLAR_SIGN_WITH_KEY` | Default for `--sign-with-key`. |
| `STELLAR_SIGN_WITH_LAB` | Default for `--sign-with-lab`. |
| `STELLAR_SIGN_WITH_LEDGER` | Default for `--sign-with-ledger`. |
| `STELLAR_RESOURCE_FEE` | Default for `--resource-fee` on Soroban commands. |
| `STELLAR_AUTH_MODE` | Default for `--auth-mode` on Soroban commands. |
| `STELLAR_CONTRACT_ID` | Default for `--id` or `--contract-id` on `contract` commands. |
| `STELLAR_CONTAINER_ENGINE` | Default for `--engine` on `container` commands. |
| `STELLAR_ARCHIVE_URL` | Default for `--archive-url` on `snapshot create`. |
| `STELLAR_SEND` | Default for `--send` on `contract invoke`. |
| `STELLAR_INVOKE_VIEW` | Deprecated default for `contract invoke --is-view`. Use `STELLAR_SEND`. |
| `STELLAR_NO_CACHE` | Default for `--no-cache`. |
| `RUST_LOG` | Default for `--filter-logs`. |
| `DOCKER_HOST` | Default for `--docker-host` on `container` commands. |
| `STELLAR_EDITOR` | Editor `tx edit` opens. Checked before `EDITOR` and `VISUAL`. |

Print what the CLI resolved from flags, environment variables, and saved defaults with
`stellar env`. Secret-bearing values are concealed by default. Pass `--reveal` to print them, or
pass a name (`stellar env STELLAR_ACCOUNT`) to print one value with no shell quoting.

## `stellar token`

Interacts with SEP-41 tokens and Stellar Asset Contracts. `--id` on every subcommand accepts
`native`, a classic asset as `CODE:ISSUER`, a `C…` contract address, or a saved contract alias.

`stellar token` has no verb for spending an allowance once granted, and no verb for creating a
trustline. Both go through `contract invoke` instead.

`contract invoke --id` is stricter than `token --id`: it accepts only a `C…` contract address or a
saved alias, not `CODE:ISSUER` and not `native`. Passing `CODE:ISSUER` fails:

```console
$ stellar contract invoke --id USDC:GBBD47IF… --source agent-1 --network testnet --send no -- balance --id <ADDRESS>
❌ error: Invalid name: USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
 only alphanumeric characters, underscores (_), and hyphens (-) are allowed.
```

Resolve the contract address first, with a plain read that needs no source account:

```bash
SAC=$(stellar contract id asset --asset <CODE:ISSUER> --network <NET>)

stellar contract invoke --id "$SAC" --source <SPENDER> --network <NET> \
  -- transfer_from --spender <SPENDER_ADDRESS> --from <OWNER_ADDRESS> --to <DEST> --amount <SMALLEST_UNIT>

stellar contract invoke --id "$SAC" --source <IDENTITY> --network <NET> \
  -- trust --addr <ADDRESS>
```

`transfer_from` is the only way to spend a `token approve` allowance. The spender signs, and the
allowance is reduced by the amount transferred. `--to` needs a trustline for the asset, the same
precondition an ordinary transfer has; a missing one fails with `Error(Contract, #13)`. `trust`
creates the caller's own trustline for a classic asset, a friendlier alternative to
`tx new change-trust` for that one purpose.

Neither `token transfer` nor `token approve` accepts `--build-only`. There is no build-only handoff
for this family. Where one is needed for a payment, use `stellar tx new payment --build-only`
instead of `token transfer`; it moves the same value through a native operation rather than a
contract call.

### `stellar token transfer`

Submits a transaction. No `--build-only` flag.

| Flag | Required | Description |
|---|---|---|
| `--id <ID>` | Yes | The token to transfer. |
| `--from <FROM>` | Yes | Account to transfer from. Signs and authorizes the transfer, so it must be an identity or secret key you control. |
| `--to <TO>` | Yes | Account or contract to receive the transfer. Accepts a `G…`/`M…` account, a `C…` contract address, or an alias. |
| `--amount <AMOUNT>` | Yes | Amount in the token's smallest unit (stroops for a Stellar Asset Contract). |
| `--output <OUTPUT>` | No | `text`, `json`, or `json-formatted`. Default `text`. |

Also accepts [RPC options](#rpc-options) and [signing options](#signing-options).

### `stellar token balance`

Read-only.

| Flag | Required | Description |
|---|---|---|
| `--id <ID>` | Yes | The token to query. |
| `--account <ACCOUNT>` | Yes | Account or contract whose balance to read. |
| `--decimal` | No | Formats the balance using the token's `decimals` instead of the raw smallest-unit integer. |
| `--output <OUTPUT>` | No | `text`, `json`, or `json-formatted`. Default `text`. |

Also accepts [RPC options](#rpc-options).

### `stellar token name`

Read-only. `--id <ID>` (required), `--output <text|json|json-formatted>` (default `text`). Also
accepts [RPC options](#rpc-options).

**Build note:** `token name`, `symbol`, `decimals`, `approve`, and `allowance` in this section are
merged but not in the 28.0.0 release. On a release install each exits `2` with
`error: unrecognized subcommand`. They need a build from `main`, and bare `stellar` resolves to the
release on most machines. See [Quickstart step 1](../quickstart.md).

### `stellar token symbol`

Read-only. Same shape as `stellar token name`.

### `stellar token decimals`

Read-only. Same shape as `stellar token name`.

### `stellar token approve`

Submits a transaction. No `--build-only` flag.

| Flag | Required | Description |
|---|---|---|
| `--id <ID>` | Yes | The token to approve an allowance on. |
| `--from <FROM>` | Yes | Account granting the allowance. Signs and authorizes the approval, so it must be an identity or secret key you control. |
| `--spender <SPENDER>` | Yes | Account or contract allowed to spend on `--from`'s behalf. Accepts a `G…`/`M…` account, a `C…` contract address, or an alias. |
| `--amount <AMOUNT>` | Yes | Allowance to grant, in the token's smallest unit. Replaces any existing allowance rather than adding to it. |
| `--expiration-ledger <EXPIRATION_LEDGER>` | Yes | Ledger sequence after which the allowance expires. Must be at or beyond the current ledger when the amount is positive. |
| `--output <OUTPUT>` | No | `text`, `json`, or `json-formatted`. Default `text`. |

Also accepts [RPC options](#rpc-options) and [signing options](#signing-options).

See [`stellar token`](#stellar-token) above for how the spender draws on this allowance with
`contract invoke -- transfer_from`. `stellar token` itself has no verb for it.

### `stellar token allowance`

Read-only.

| Flag | Required | Description |
|---|---|---|
| `--id <ID>` | Yes | The token to query. |
| `--from <FROM>` | Yes | Account or contract that granted the allowance, the owner of the funds. |
| `--spender <SPENDER>` | Yes | Account or contract allowed to spend on `--from`'s behalf. |
| `--decimal` | No | Formats the allowance using the token's `decimals` instead of the raw smallest-unit integer. |
| `--output <OUTPUT>` | No | `text`, `json`, or `json-formatted`. Default `text`. |

Also accepts [RPC options](#rpc-options).

See [Output and errors](output-and-errors.md) for the `token` family's typed JSON error envelope.

## `stellar tx`

Signs, simulates, and sends transactions. Every `tx` subcommand that takes an XDR argument reads
it from stdin when the argument is omitted, so these commands compose in a pipeline:

```bash
stellar tx new payment --source agent-1 --destination <ADDRESS> --amount 10000000 --build-only --network testnet \
  | stellar tx sign --sign-with-key agent-1 --network testnet \
  | stellar tx send --network testnet
```

`--build-only` still calls RPC, to read the source account's sequence number. It needs a reachable
network and a funded source account; it does not sign or submit. Only `tx sign` and `tx hash` are
genuinely offline. Pass `--network` explicitly at the sign stage; see the warning under
[`stellar tx sign`](#stellar-tx-sign-tx_xdr) below.

[Build and submit transactions](../guides/build-and-submit-transactions.md) covers the pipeline as a
procedure, including air-gapped signing. [Architecture](architecture.md) covers why it composes.

### `stellar tx new`

Submits a transaction (unless `--build-only` is passed). Builds one of 22 native Stellar
operations. Every operation accepts [transaction options](#transaction-options),
[signing options](#signing-options), and [RPC options](#rpc-options) in addition to the flags
below.

None of the 22 operations has an `--output` flag, and a submitted operation writes nothing to
stdout on success. The transaction hash appears only on an `ℹ️  Signing transaction: <HASH>` stderr
line, which `--quiet` removes along with it. See
[Output and errors](output-and-errors.md#tx-new-has-no-machine-readable-receipt) for the pipeline
that gets you a parseable result instead.

| Operation | Distinctive flags |
|---|---|
| `account-merge` | `--account` (muxed account to merge into, then removes the source account) |
| `begin-sponsoring-future-reserves` | `--sponsored-id` |
| `bump-sequence` | `--bump-to` |
| `change-trust` | `--line`, `--limit` (default `9223372036854775807`; `0` removes the trustline) |
| `claim-claimable-balance` | `--balance-id`, which takes the 64-character hex form only. It rejects the `B…` strkey `tx send` returns and Horizon's 72-hex, unlike `clawback-claimable-balance` below. Convert with `stellar strkey decode <B…> \| jq -r '.claimable_balance.v0'` |
| `clawback` | `--from`, `--asset`, `--amount` |
| `clawback-claimable-balance` | `--balance-id` (accepts an API-prefixed hex string, a raw hex string, or a `B…` strkey) |
| `create-account` | `--destination`, `--starting-balance` (default `10_000_000` stroops, 1 XLM) |
| `create-claimable-balance` | `--asset` (default `native`), `--amount`, `--claimant` (repeatable, as `<ADDRESS>` or `<ADDRESS>:<PREDICATE_JSON>`). `{"unconditional":true}` is rejected; use `{"unconditional":null}`, `"unconditional"`, or a bare address |
| `create-passive-sell-offer` | `--selling`, `--buying`, `--amount`, `--price` (`"numerator:denominator"`) |
| `end-sponsoring-future-reserves` | none beyond the shared flags |
| `liquidity-pool-deposit` | `--liquidity-pool-id`, `--max-amount-a`, `--max-amount-b`, `--min-price`/`--max-price` (default `1:1`) |
| `liquidity-pool-withdraw` | `--liquidity-pool-id`, `--amount`, `--min-amount-a`, `--min-amount-b` |
| `manage-buy-offer` | `--selling`, `--buying`, `--amount`, `--price`, `--offer-id` (`0` creates a new offer) |
| `manage-data` | `--data-name`, `--data-value` (omit to delete the entry) |
| `manage-sell-offer` | Same shape as `manage-buy-offer` |
| `path-payment-strict-send` | `--send-asset`, `--send-amount`, `--destination`, `--dest-asset`, `--dest-min`, `--path` (up to 5 assets, comma-separated) |
| `path-payment-strict-receive` | `--send-asset`, `--send-max`, `--destination`, `--dest-asset`, `--dest-amount`, `--path` |
| `payment` | `--destination`, `--asset` (default `native`), `--amount` |
| `revoke-sponsorship` | `--account-id` (required), plus one of `--asset`, `--data-name`, `--offer-id`, `--liquidity-pool-id`, `--claimable-balance-id`, `--signer-key` |
| `set-options` | See below |
| `set-trustline-flags` | See below |

A path payment whose destination is the sender is how you swap one asset for another on-network:
send asset A, receive asset B into the same account, routed through the DEX order book or an AMM
pool. `path-payment-strict-receive` fixes the amount you receive and bounds what you are willing to
send with `--send-max`; `path-payment-strict-send` fixes the amount you send and bounds what you are
willing to accept with `--dest-min`.

The CLI has no price, order book, or liquidity-depth command. There is no way to check a rate before
you trade. A path payment executes blind, and a fill against an AMM pool moves the pool's price as
it fills, so the effective rate on a larger trade can be worse than a smaller one against the same
pool. `--send-max` and `--dest-min` are the only protection: set them so a bad rate makes the
operation fail outright instead of executing at a rate you did not intend. Do not treat either flag
as optional on a swap; without one of them, a path payment has no floor or ceiling on the rate at
all.

`--claimant` on `create-claimable-balance` takes `account_id` or
`account_id:predicate_json`, repeatable for multiple claimants. Predicates support
`before_absolute_time`, `before_relative_time`, and `and`:

```bash
stellar tx new create-claimable-balance --source agent-1 --amount 10000000 \
  --claimant bob \
  --claimant 'charlie:{"and":[{"before_absolute_time":"1735689599"},{"before_relative_time":"3600"}]}' \
  --network testnet --build-only
```

`set-options` sets account flags, signers, and home domain. Flags: `--inflation-dest`,
`--master-weight`, `--low-threshold`, `--med-threshold`, `--high-threshold`, `--home-domain`,
`--signer`/`--signer-weight` (weight `0` deletes the signer), `--set-required`,
`--set-revocable`, `--set-clawback-enabled`, `--set-immutable`, and the matching `--clear-required`,
`--clear-revocable`, `--clear-immutable`, `--clear-clawback-enabled`.

`set-trustline-flags` configures authorization and clawback flags on an asset's trustline. Flags:
`--trustor`, `--asset`, `--set-authorize`, `--set-authorize-to-maintain-liabilities`,
`--set-trustline-clawback-enabled`, and the matching `--clear-authorize`,
`--clear-authorize-to-maintain-liabilities`, `--clear-trustline-clawback-enabled`.

### `stellar tx operation add`

Local edit of an existing transaction envelope (submits nothing by itself). Appends one operation
to the envelope read from stdin. Accepts the same 22 operations as `stellar tx new`, under
`stellar tx operation add <OPERATION>`. `stellar tx op add` is an accepted short form.

It takes one flag `stellar tx new` does not:

| Flag | Required | Description |
|---|---|---|
| `--operation-source-account <OPERATION_SOURCE_ACCOUNT>` | No | Alias `--op-source`. Sets the source account for this operation only, rather than for the transaction. This is what lets one transaction carry operations that different accounts authorize, which every sponsorship pattern needs. Env `STELLAR_OPERATION_SOURCE_ACCOUNT`. |

Without it, every appended operation inherits the transaction's source. With it, the operation
carries its own `source_account` in the envelope and that account must also sign.

It does not raise the transaction's fee as it adds operations, so a multi-operation transaction
composed this way is underfunded by default and fails with `TxInsufficientFee`. Set the fee for the
finished transaction on the first command: `--inclusion-fee 300` covers three operations.

### `stellar tx update sequence-number next`

Read-only network call. Fetches the source account's current sequence number and increments it
for the given transaction. Accepts [RPC options](#rpc-options).

### `stellar tx edit`

Local edit. Opens a transaction envelope read from stdin in `$STELLAR_EDITOR`, `$EDITOR`, or
`$VISUAL`, checked in that order, and writes the edited envelope back to stdout.

### `stellar tx hash [TX_XDR]`

Read-only. Computes a transaction envelope's hash. Accepts [RPC options](#rpc-options).

### `stellar tx sign [TX_XDR]`

Local signing. No network call is required beyond an optional passphrase lookup. Accepts
[signing options](#signing-options) and [RPC options](#rpc-options).

Pass `--network` or `--network-passphrase` explicitly. Without either, `tx sign` falls back to the
saved default network's passphrase. A signature commits to the passphrase it was made with, so
signing on a machine whose default is testnet produces a valid-looking envelope for a mainnet
transaction that fails on submission with `TxBadAuth`. Hashing the same envelope with no network
flags and with the testnet passphrase produces the same hash; hashing it with the mainnet
passphrase produces a different one, confirming the passphrase, not the flag you passed, is what
the signature is over.

### `stellar tx simulate [TX_XDR]`

Read-only network call. Requires `--source-account` even though it submits nothing.
`--instruction-leeway <INSTRUCTION_LEEWAY>` allows extra instructions when budgeting resources.
Accepts [transaction options](#transaction-options), [signing options](#signing-options), and
[RPC options](#rpc-options).

### `stellar tx send [TX_XDR]`

Submits a transaction to the network. Accepts [RPC options](#rpc-options). Unlike `tx new`, this is
the stage that returns a parseable JSON result: top-level keys `status`, `ledger`,
`application_order`, `fee_bump`, `tx_hash`, `created_at`, `envelope`, `result`, `result_meta`, and
`events`. `status` is `SUCCESS` on success. The hash field is `tx_hash`, not `hash`.

### `stellar tx fetch`

Read-only.

| Command | Description |
|---|---|
| `tx fetch --hash <HASH>` | Fetches the transaction envelope. `--output` is `json`, `json-formatted`, or `xdr`. Default `json`. |
| `tx fetch result --hash <HASH>` | Fetches the transaction result. Same `--output` set as above. `json-formatted` prepends a `Transaction Status` / `Transaction Ledger` header to stdout and does not parse as JSON; use `json` to parse. |
| `tx fetch meta --hash <HASH>` | Fetches the transaction meta. Same `--output` set. |
| `tx fetch fee --hash <HASH>` | Fetches fee information. `--output` is `json`, `json-formatted`, or `table`. Default `table`, unlike the other three. |
| `tx fetch events --hash <HASH>` | Fetches the transaction's events. `--output` is `json`, `json-formatted`, or `text`. Default `json`. |

All five accept [RPC options](#rpc-options).

There is no command to enumerate an account's transaction history. `tx fetch` and its subcommands
only look up a transaction you already have the hash for. If you need a list of what an account has
done, you need a hash for each transaction from somewhere else, for example your own records of
what you submitted, or a third-party indexer or explorer.

### `stellar tx decode [INPUT]...`

Read-only. Decodes a transaction envelope from XDR to JSON. `--input <single-base64|single>`
(default `single-base64`), `--output <json|json-formatted>` (default `json`).

### `stellar tx encode [INPUT]...`

Read-only. Encodes a transaction envelope from JSON to XDR. `--input <json>` (only value),
`--output <single-base64|single>` (default `single-base64`).

## `stellar keys`

Creates and manages identities. `stellar keys public-key` has the alias `address`.

### `stellar keys add <NAME>`

Mutates local config.

| Flag | Required | Description |
|---|---|---|
| `--secret-key` | No | Deprecated. Use `--secure-store`. Prompts for a secret (`S…`) key. |
| `--seed-phrase` | No | Deprecated. Use `--secure-store`. Prompts for a 12 to 24 word seed phrase. |
| `--secure-store` | No | Saves the new key in the OS credential store: Keychain on macOS, Secure Store Service on Windows, kernel keyutils with the DBus Secret Service on Linux. Supports seed phrases only, not raw secret keys. |
| `--public-key <PUBLIC_KEY>` | No | Adds a watch-only public key, ed25519, or muxed account, for example `G…` or `M…`. |
| `--ledger` | No | Derives the address from a connected Ledger hardware wallet at `m/44'/148'/N'`. `N` defaults to `0`, set with `--hd-path`. Persists the derived public key so later commands work without the device attached. |
| `--overwrite` | No | Overwrites an existing identity of the same name. Combined with `--secure-store`, also replaces the existing secure store entry. |
| `--hd-path <HD_PATH>` | No | HD path used when importing a seed phrase. Persisted on the identity. Not valid with `--public-key` or a raw secret key. |

### `stellar keys public-key [NAME]` (alias `address`)

Read-only. `NAME` is required unless `--ledger` is passed. `--hd-path <HD_PATH>` (default `0`),
`--ledger` (derive from a connected hardware wallet instead of a saved identity).

### `stellar keys fund [NAME]`

Submits a transaction, via friendbot on a test network. `NAME` is required unless `--ledger` is
passed. `--hd-path`, `--ledger`. Accepts [RPC options](#rpc-options). See
[Supported networks](supported-networks.md) for which networks have a friendbot.

### `stellar keys generate <NAME>`

Mutates local config. Generates a new identity from a 24-word seed phrase.

| Flag | Required | Description |
|---|---|---|
| `--seed <SEED>` | No | Optional seed used to generate the phrase deterministically. Random otherwise. |
| `-s, --as-secret` | No | Outputs the generated identity as a secret key instead of a seed phrase. |
| `--secure-store` | No | Saves the seed phrase in the OS credential store. |
| `--hd-path <HD_PATH>` | No | HD path to derive the key at. Persisted on the identity. |
| `--fund` | No | Funds the generated key pair with friendbot in the same call. |
| `--overwrite` | No | Overwrites an existing identity of the same name. |

Also accepts [RPC options](#rpc-options).

### `stellar keys ls`

Read-only. `-l, --long` prints each identity's file path alongside its name.

### `stellar keys rm <NAME>`

Mutates local config. Removes an identity file. `--force` skips the confirmation prompt.

### `stellar keys secret <NAME>`

Read-only, but prints sensitive material. `--phrase` prints the seed phrase instead of the secret
key. `--hd-path <HD_PATH>` (default `0`).

### `stellar keys use <NAME>` / `stellar keys unset`

Mutates local config. Sets or clears the default identity used when `--source` is omitted. This is
a machine-wide default, written to `~/.config/stellar/config.toml`, not scoped to a shell session
or a project. On a shared machine, prefer `STELLAR_ACCOUNT=<NAME>` set in your own environment
instead; it takes precedence over the saved default and does not change what anyone else's session
resolves to.

## `stellar network`

Configures connections to networks. See [Supported networks](supported-networks.md) for the
built-in set, passphrases, and funding methods.

### `stellar network add <NAME>`

Mutates local config. `--rpc-url <RPC_URL>` (required), `--network-passphrase <NETWORK_PASSPHRASE>` (required), `--rpc-header <RPC_HEADERS>` (optional, repeatable).

### `stellar network rm <NAME>` / `stellar network use <NAME>` / `stellar network unset`

Mutates local config. Removes a saved network, or sets/clears the default network used when
`--network` is omitted. Like `keys use`, this is machine-wide, not scoped to a shell session. On a
shared machine, prefer `STELLAR_NETWORK=<NAME>` in your own environment instead of `network use`.

### `stellar network ls`

Read-only. `-l, --long` prints the RPC URL, headers, and passphrase for each network.

### `stellar network health`

Read-only network call. `--output <text|json|json-formatted>` (default `text`). Accepts
[RPC options](#rpc-options).

### `stellar network info`

Read-only network call. Same flags and behavior as `network health`. The CLI's own help text
describes both commands identically ("Checks the health of the configured RPC").

### `stellar network settings`

Read-only network call. Fetches the network's `ConfigUpgradeSet`. `--internal` includes
non-upgradeable, internally maintained settings. `--output <xdr|json|json-formatted>` (default
`json`). Accepts [RPC options](#rpc-options).

### `stellar network root-account`

Read-only, computed locally from the passphrase, no network call. `public-key` (alias `address`)
and `secret` each take `--network-passphrase` or `-n, --network` and print the network's root
keypair.

## `stellar contract`

Tools for smart contract developers.

### `--id` versus `--contract-id`

On a build from `main`, the canonical spelling of the contract-selection flag is `--contract-id`,
and `--id` is a visible alias for it on `contract invoke`, `read`, `extend`, `restore`, `fetch`, and
`alias add`. On the 28.0.0 release those six commands accept only `--id`; `--contract-id` exits `2`
there with `error: unexpected argument '--contract-id' found`.

`--id` therefore works on both builds and `--contract-id` does not, which is why every example on
this page still uses `--id`. The CLI's own agent guide (`stellar skill`) makes the same call: it
tells agents to prefer `--id` everywhere.

Two things this rename does **not** touch:

- The whole `stellar token` family. `token balance`, `transfer`, `name`, `symbol`, `decimals`,
  `approve`, and `allowance` still take `--id`, with no `--contract-id` spelling on either build.
  The flag there names a token, not a contract, and accepts `native` and `CODE:ISSUER` too.
- `stellar events --id`, `stellar cache actionlog read --id`, and
  `stellar ledger entry fetch claimable-balance|liquidity-pool --id`. Those name an event filter, a
  cache entry, and a ledger entry, not a contract.

`stellar contract info` already used `--contract-id` with an `--id` alias on the release, so nothing
changed for it.

The environment variable does not follow the alias everywhere, which is easy to assume and wrong.
All six commands carry `[aliases: --id]`, but only `contract invoke` and `contract fetch` also carry
`[env: STELLAR_CONTRACT_ID=]`. `contract info` reads it as well. `contract read`, `extend`,
`restore`, and `alias add` do not, so the variable being set does not satisfy the requirement:

```console
$ STELLAR_CONTRACT_ID=CCR6QKTW… stellar contract read --key COUNTER --network testnet
error: the following required arguments were not provided:
  --contract-id <CONTRACT_ID>
```

That exits `2` while the same environment satisfies `contract invoke`. Pass the contract explicitly
on the four commands that ignore the variable.

### `stellar contract build`

Read-only network-wise, writes wasm files locally. Compiles a Cargo workspace to `wasm32v1-none`.

| Flag | Required | Description |
|---|---|---|
| `--manifest-path <MANIFEST_PATH>` | No | Path to `Cargo.toml`. |
| `--package <PACKAGE>` | No | Package to build. Builds every `cdylib` crate in the workspace if omitted. |
| `--profile <PROFILE>` | No | Cargo profile to build with. Default `release`. |
| `--out-dir <OUT_DIR>` | No | Additional directory to copy wasm files to. |
| `--locked` | No | Asserts `Cargo.lock` stays unchanged. |
| `--optimize[=true\|false]` | No | Optimizes the generated wasm. Default `true`. Requires the `additional-libs` feature. |
| `--features <FEATURES>` | No | Space- or comma-separated feature list to activate. |
| `--all-features` | No | Activates every feature. |
| `--no-default-features` | No | Disables default features. |
| `--print-commands-only` | No | Prints the build commands without executing them. |
| `--image <IMAGE>` | No | Runs the build inside this container image against the bind-mounted working tree, instead of locally. |
| `--pull` | No | Pulls `--image` before building, to refresh a moving tag. Without it the build uses the image already present locally and does not pull, matching `docker run`, so a digest-pinned or locally built image is used as-is. A failed pull exits non-zero with `could not pull image <IMAGE>`. |
| `-d, --docker-host <DOCKER_HOST>` | No | Overrides the default Docker host path. Env `DOCKER_HOST`. |
| `--engine <docker\|apple-container>` | No | Container engine to use. Default `docker`. Env `STELLAR_CONTAINER_ENGINE`. |
| `--cpus <CPUS>` | No | Limits container CPUs. Must be a whole number for Apple's `container` engine. |
| `--memory <MEMORY>` | No | Limits container memory, for example `2g` or `512m`. |
| `--meta <META>` | No | Adds a key-value pair to the contract's `contractmetav0` custom section. |

### `stellar contract build archive`

**main build only.** Absent from the 28.0.0 release, where `contract build archive` exits `2` with
`error: unexpected argument 'archive' found`.

Writes files locally, no network call. Produces a gzipped tarball of the current working directory
and prints the SHA-256 that SEP-58 calls `source_sha256`. It honors the project's `.gitignore` and
`.ignore`, and always skips `.git`. Run it from the project or workspace root you want archived.

| Flag | Required | Description |
|---|---|---|
| `-o, --out-file <OUT_FILE>` | Yes, unless `--dry-run` | Where to write the gzipped tarball. |
| `--dry-run` | No | Lists the entries that would be archived and computes `source_sha256` without writing a file. |

Entries are archived under a `source/` prefix, and the tarball is written at mode `0600`.

The two modes split their output across streams differently, which matters if you script this:

```console
$ stellar contract build archive --dry-run 2>/dev/null   # stdout only
📄 source/.gitignore
📄 source/Cargo.toml
📄 source/src/main.rs

$ stellar contract build archive --dry-run 2>&1 1>/dev/null   # stderr only
ℹ️  3 files
ℹ️  source_sha256 9265be17f9ebb2db4ed7bb29eddc15b8a77eca40b4537b543f9537eba58b0b75
```

The file list goes to stdout. The count and the `source_sha256` go to stderr. A write run (`-o`)
prints nothing at all to stdout; its `✅ Wrote source archive <PATH> (source_sha256 <HASH>)` line is
on stderr. Capture stderr to read the hash either way.

`-q` suppresses the `ℹ️` and `✅` lines, and therefore the hash. Under `-q` a dry run still prints
the `📄` file list on stdout, and a write run prints nothing on either stream. Do not pass `-q` when
you need the hash.

Omitting both `-o` and `--dry-run` exits `2` with `error: the following required arguments were not
provided: --out-file <OUT_FILE>`.

### `stellar contract init <PROJECT_PATH>`

Writes files locally. Scaffolds a Cargo workspace with a sample Soroban contract. `--name`
(default `hello-world`), `--overwrite` (overwrites all existing files).

### `stellar contract deploy`

Submits a transaction. Deploys a wasm contract.

| Flag | Required | Description |
|---|---|---|
| `--wasm <WASM>` | No | Wasm file to deploy. Builds automatically inside a Cargo workspace if omitted; required outside one, alongside `--wasm-hash`. |
| `--wasm-hash <WASM_HASH>` | No | Hash of an already installed or deployed wasm file. |
| `--salt <SALT>` | No | Custom 32-byte salt for the contract ID. |
| `-i, --ignore-checks` | No | Ignores safety checks when deploying. |
| `--alias <ALIAS>` | No | Saves the deployed contract's ID under this alias, overwriting any existing alias of the same name without confirmation. |
| `--optimize[=true\|false]` | No | Optimizes the generated wasm. Default `true`. |
| `--package <PACKAGE>` | No | Package to build when `--wasm` is not provided. |
| `--meta <META>` | No | Adds a key-value pair to the contract's meta. |

Constructor arguments follow a trailing `--`, as `--arg-name value`. Also accepts
[transaction options](#transaction-options), [signing options](#signing-options), and Soroban
simulation flags (`--resource-fee`, `--instruction-leeway`, `--cost`, `--auth-mode`).

### `stellar contract upload`

Submits a transaction. Installs a wasm file without creating a contract instance. Same wasm,
fee, build, and signing flags as `deploy`, minus `--salt` and `--alias`.

### `stellar contract install` (deprecated, use `contract upload`)

Same flags as `contract upload`.

### `stellar contract invoke`

Submits a transaction, unless simulation alone answers the call. Invokes a contract function.
Generates a typed CLI from the contract's own schema on the fly; see
[Generated per-contract CLI](#generated-per-contract-cli) below.

| Flag | Required | Description |
|---|---|---|
| `--id <CONTRACT_ID>` | Yes | Contract to invoke. Env `STELLAR_CONTRACT_ID`. Spelled `--contract-id` on a `main` build, where `--id` is an alias for it; see [`--id` versus `--contract-id`](#--id-versus---contract-id). |
| `--is-view` | No | Deprecated. Use `--send=no`. |
| `--send <default\|no\|yes>` | No | `default` sends a transaction only if simulation shows ledger writes, published events, or required auth; `no` never sends, returning the simulation result; `yes` always sends. Env `STELLAR_SEND`. |

Also accepts [transaction options](#transaction-options), [signing options](#signing-options),
[RPC options](#rpc-options), and Soroban simulation flags.

### `stellar contract read`

Read-only. Prints a contract-data ledger entry's current value.

| Flag | Required | Description |
|---|---|---|
| `--output <string\|json\|xdr>` | No | Default `string`. `json` is advertised but broken; see below. |
| `--id <CONTRACT_ID>` | No | Contract that owns the data entry. Extends the contract's own instance if no key is given. Spelled `--contract-id` on a `main` build, where `--id` is an alias for it. |
| `--key <KEY>` | No | Storage key, symbols only. |
| `--key-xdr <KEY_XDR>` | No | Storage key as base64-encoded XDR. |
| `--wasm <WASM>` / `--wasm-hash <WASM_HASH>` | No | Path to wasm, or a wasm hash, if reading against code rather than an instance. |
| `--durability <persistent\|temporary>` | No | Default `persistent`. |

Also accepts [RPC options](#rpc-options).

`--output json` does not emit JSON. It emits CSV with a JSON-looking value embedded in a
doubled-quote field, and it fails to parse with a standard JSON decoder. Do not pipe it into a JSON
parser. Use `--output xdr` and decode the result with `stellar xdr decode`, or parse the CSV
directly. See [Output and errors](output-and-errors.md#contract-read---output-json-is-broken).

### `stellar contract extend`

Submits a transaction. Extends the time to live of a contract-data ledger entry. If no keys are
given, extends the contract instance itself. Same `--id`/`--key`/`--key-xdr`/`--wasm`/
`--wasm-hash`/`--durability` flags as `contract read`, plus `--ledgers-to-extend <LEDGERS_TO_EXTEND>` (required) and `--ttl-ledger-only` (prints only the new TTL ledger). Also
accepts [transaction options](#transaction-options), [signing options](#signing-options), and
Soroban simulation flags.

### `stellar contract restore`

Submits a transaction. Restores an evicted contract-data entry. Same key and durability flags as
`extend`, plus `--ledgers-to-extend` and `--ttl-ledger-only`.

### `stellar contract fetch`

Read-only. Downloads a contract's wasm binary. `--id <CONTRACT_ID>` (env `STELLAR_CONTRACT_ID`),
`--wasm-hash <WASM_HASH>`, `-o, --out-file <OUT_FILE>` (defaults to stdout). Accepts
[RPC options](#rpc-options). `--id` is spelled `--contract-id` on a `main` build, where `--id` is an
alias for it.

Passing neither selector errors. The message names whichever spelling the build considers canonical:
`error: must provide one of --wasm-hash, or --id` on the 28.0.0 release, and `error: must provide one
of --wasm-hash, or --contract-id` on a `main` build. Match on `must provide one of`, not on the flag
name.

### `stellar contract info`

Read-only. Introspects a contract's spec, metadata, build attestation, or wasm hash.

| Command | Description |
|---|---|
| `contract info interface` | Contract's `SCSpecEntry` interface. `--output <rust\|xdr-base64\|json\|json-formatted>`, default `rust`. |
| `contract info meta` | Contract's `SCMetaEntry` metadata. `--output <text\|xdr-base64\|json\|json-formatted>`, default `text`. |
| `contract info env-meta` | Contract's `SCEnvMetaEntry` environment metadata. Same `--output` set as `meta`. |
| `contract info build` | Build attestation, if the contract has a `source_repo=github:user/repo` meta entry. No `--output` flag. |
| `contract info hash` | SHA-256 hash of the contract's wasm. No `--output` flag. |

All five take `--wasm <WASM>`, `--wasm-hash <WASM_HASH>`, or `--contract-id <CONTRACT_ID>`
(alias `--id`, env `STELLAR_CONTRACT_ID`), exactly one of the three. `contract info hash` accepts
only `--wasm` or `--contract-id`, and returns an error against a Stellar Asset Contract, which has
no wasm. All five accept [RPC options](#rpc-options).

### `stellar contract inspect` (deprecated, use `contract info`)

Read-only. `--wasm <WASM>` (required), `--output <xdr-base64|xdr-base64-array|docs>` (default
`docs`).

### `stellar contract optimize` (deprecated, use `build --optimize`)

Writes files locally. `--wasm <WASM>...` (one or more, required), `--wasm-out <WASM_OUT>`
(defaults to the input path with a `.optimized.wasm` suffix).

### `stellar contract id`

Read-only, computed locally. `contract id asset --asset <ASSET>` derives a built-in Stellar Asset
Contract's ID from a classic asset (`native`, `USDC:G...5`, or `USDC:<alias>`). `contract id wasm --salt <SALT> --source-account <SOURCE_ACCOUNT>` derives a wasm contract's ID from a salt and
source account. Both accept [RPC options](#rpc-options).

### `stellar contract asset`

`contract asset id --asset <ASSET>` (deprecated, use `contract id asset`) gets a built-in Stellar
Asset Contract's ID. `contract asset deploy --asset <ASSET> --source-account <SOURCE_ACCOUNT>`
submits a transaction that deploys the built-in Stellar Asset Contract wrapping a classic asset,
with an optional `--alias <ALIAS>` to save it under a name.

### `stellar contract alias`

Mutates local config, per network.

| Command | Description |
|---|---|
| `contract alias add <ALIAS> --id <CONTRACT_ID>` | Saves an alias for a contract ID. `--overwrite` replaces an existing alias of the same name. `--id` is spelled `--contract-id` on a `main` build, where `--id` is an alias for it. |
| `contract alias rm <ALIAS>` | Removes a saved alias. Named `remove` on the 28.0.0 release. A `main` build renamed it to `rm` and kept `remove` as a command alias, so `remove` works on both builds and `rm` works only on `main`. Exits `1` if no such alias exists on the current network: `error: no contract found with alias '<ALIAS>' for network '<PASSPHRASE>'`. |
| `contract alias show <ALIAS>` | Prints the contract ID an alias resolves to. |
| `contract alias ls` | Lists every saved alias, grouped by network. |

### `stellar contract bindings`

Writes files locally. Generates client bindings from a contract's schema.

| Command | Flags |
|---|---|
| `contract bindings rust --wasm <WASM>` | `--wasm` is required. No other flags. |
| `contract bindings typescript` | **Deprecated on a `main` build.** `--wasm <WASM>`, `--wasm-hash <WASM_HASH>`, or `--contract-id <CONTRACT_ID>` (alias `--id`), exactly one; `--output-dir <OUTPUT_DIR>` (required); `--overwrite`. |
| `contract bindings python` \| `java` \| `flutter` \| `swift` \| `php` | Stubs. No flags, and they generate nothing; see below. |
| `contract bindings kmp` | **main build only.** A sixth stub; see below. |

Only `rust` and `typescript` generate a file. The other six are registered subcommands that take no
flags, write nothing, and exit `1` with the same sentence, their own language substituted:

```text
❌ error: python binding generation is not implemented in the stellar-cli, but is available via the tool located here: https://github.com/lightsail-network/stellar-contract-bindings
```

This is true on the 28.0.0 release as well as on a `main` build. The five older stubs are not new;
`kmp` joins them. A subcommand appearing in `contract bindings --help` is not evidence it works, so
run it once before scripting against it. For those six languages the answer is the external
[`stellar-contract-bindings`](https://github.com/lightsail-network/stellar-contract-bindings) tool.

A `main` build deprecates `contract bindings typescript`. It still runs and still generates the
package, but it now prints this to stderr before doing any work:

```text
⚠️  `stellar contract bindings typescript` is deprecated. Use the JavaScript Stellar SDK instead: https://github.com/stellar/js-stellar-sdk#cli
```

The same sentence is in its `--help` output and in the `contract bindings` subcommand list, so a
`--help` probe that greps for a description now matches `⚠️ Deprecated`. The 28.0.0 release prints
no warning.

On the 28.0.0 release, `contract bindings kmp` is not listed at all and exits `2` with `error:
unrecognized subcommand 'kmp'`. That is the only difference between the builds for this target.
Neither one generates Kotlin Multiplatform bindings.

## Generated per-contract CLI

`stellar contract invoke --id <CONTRACT> -- --help` reads the contract's own schema from the
network and generates a typed CLI for it on the fly. Everything after the `--` is parsed by that
generated CLI, not by `invoke` itself:

```bash
stellar contract invoke --id <CONTRACT> --source agent-1 --network testnet -- --help
stellar contract invoke --id <CONTRACT> --source agent-1 --network testnet -- <FUNCTION> --help
```

The generated CLI lists the contract's exported functions as subcommands, and each function's own
`--help` lists its arguments with their types, for example `--to <String>`. Passing `--send no` on
the outer `invoke` command runs the call as simulation only and submits nothing, regardless of
which function is called. See [Architecture](architecture.md) for how this generation works.

## `stellar message`

Signs and verifies arbitrary messages using SEP-53. Prefixes the message with `"Stellar Signed
Message:\n"` and SHA-256-hashes it before ed25519-signing or verifying.

### `stellar message sign [MESSAGE]`

Local signing, no network call. Reads the message from stdin if omitted. `--base64` treats the
message as base64-encoded binary. Accepts [signing options](#signing-options), of which
`--sign-with-key` is required.

### `stellar message verify [MESSAGE]`

Read-only, local. `-s, --signature <SIGNATURE>` (required, base64), `-p, --public-key <PUBLIC_KEY>` (required, an identity or a `G…` address), `--hd-path <HD_PATH>`, `--base64`.

## `stellar ledger`

Read-only. Fetches ledger information.

### `stellar ledger latest`

`--output <text|json|json-formatted>` (default `text`). Accepts [RPC options](#rpc-options).

### `stellar ledger fetch <SEQ>`

`--limit <LIMIT>` (default `1`), `--output <text|json|json-formatted>` (default `text`),
`--xdr-format <json|xdr>` (default `json`, controls whether header and metadata XDR fields come
back as JSON or raw XDR). Accepts [RPC options](#rpc-options).

### `stellar ledger entry fetch`

Fetches a ledger entry by key. Subcommands: `account` (`--account`), `contract-data`
(`--contract`, `--durability`, `--key`/`--key-xdr`, `--instance`), `claimable-balance`,
`liquidity-pool`, `contract-code`, `trustline`, `data`, `offer`. `account` and `contract-data`
share `--output <json|json-formatted|xdr>` (default `json`). Accepts [RPC options](#rpc-options).

## `stellar fees`

### `stellar fees stats`

Read-only network call. `--output <text|json|json-formatted>` (default `text`). Accepts
[RPC options](#rpc-options).

### `stellar fees use`

Mutates local config. Sets a default inclusion fee for future commands. Exactly one of `--amount
<AMOUNT>` (stroops) or `--fee-metric <max|min|mode|p10|p20|p30|p40|p50|p60|p70|p80|p90|p95|p99>`
(a percentile from the network's fee stats) is required. Accepts [RPC options](#rpc-options).

This sets a default fee bid. It is not a spend limit. See
[Authority model](authority-model.md).

### `stellar fees unset`

Mutates local config. Removes the default inclusion fee set by `fees use`.

## `stellar fee-stats` (deprecated, use `fees stats`)

Read-only network call. Same `--output` set and default as `fees stats`.

## `stellar events`

Read-only, long-running stream. Watches the network for contract events.

| Flag | Required | Description |
|---|---|---|
| `--start-ledger <START_LEDGER>` | No | First ledger sequence in the range to pull events. |
| `--cursor <CURSOR>` | No | Cursor corresponding to the start of the event range. |
| `--output <pretty\|plain\|json\|raw>` | No | Default `pretty`. |
| `-c, --count <COUNT>` | No | Maximum events to display, deferring to the server's limit. Default `10`. |
| `--id <CONTRACT_IDS>...` | No | Up to 5 contract IDs to filter on. Repeatable, or pass several in one flag. |
| `--topic <TOPIC_FILTERS>...` | No | Up to 5 topic filters, 1 to 4 comma-separated segments each. `*` is a wildcard segment; a trailing `**` matches any remaining number of segments. |
| `--type <all\|contract\|system>` | No | Default `all`. |

Accepts [RPC options](#rpc-options).

## `stellar env`

Read-only. Prints resolved environment variables in a format usable as a `.env` file. `[NAME]`
prints a single variable's value with no shell quoting, suitable for command substitution.
`--reveal` prints concealed secret values; without it, concealed variables print a placeholder, or
nothing at all when a single `NAME` is requested.

## `stellar config`

### `stellar config dir`

Read-only. Prints the global config directory, resolved from `$XDG_CONFIG_HOME/stellar`, falling
back to `~/.config/stellar`, or `--config-dir`.

### `stellar config migrate`

Mutates local config. Migrates local configuration into the global config directory.

## `stellar doctor`

Read-only. No subcommands or distinctive flags. Reports:

- Whether the installed CLI version is current.
- The local Rust toolchain version and whether the `wasm32v1-none` target is installed.
- Whether wasm optimization is available.
- Whether the OS secure store (keyring) is usable.
- Whether a Ledger hardware wallet library is usable.
- Whether a container engine (`docker` or `apple-container`) is available.
- The resolved config directory and data directory paths.
- The installed XDR schema version.
- Every configured network's reachability, and its protocol and RPC version if reachable.

It does not check account funding, API keys, or contract-level health.

## `stellar cache`

### `stellar cache clean`

Mutates local state. Deletes the simulation and transaction cache.

### `stellar cache path`

Read-only. Prints the cache's location on disk.

### `stellar cache actionlog`

Read-only. Experimental; may change without notice. `actionlog ls` lists cached actions
(transactions, simulations), with `-l, --long` for more detail. `actionlog read --id <ID>` prints
one cached action.

## `stellar snapshot`

### `stellar snapshot create`

Read-only network call, writes a file locally. Creates a ledger snapshot from a history archive.

| Flag | Required | Description |
|---|---|---|
| `--ledger <LEDGER>` | No | Ledger sequence to snapshot. Defaults to the latest archived ledger. |
| `--out <OUT>` | No | Output path. Default `snapshot.json`. |
| `--address <ADDRESS>` | No | Account or contract address/alias to include. Repeatable. An invalid contract ID here is ignored rather than erroring. |
| `--wasm-hash <WASM_HASHES>` | No | Wasm hashes to include. |
| `--archive-url <ARCHIVE_URL>` | No | Archive URL. Env `STELLAR_ARCHIVE_URL`. |

`--output` accepts only `json`.

### `stellar snapshot merge <SNAPSHOTS> <SNAPSHOTS>...`

Writes a file locally. Merges at least 2 snapshot files. On a key conflict, the last snapshot in
the argument list wins, and metadata is taken from the last snapshot. `-o, --out <OUT>` (default
`snapshot.json`).

## `stellar xdr`

Read-only.

| Command | Description |
|---|---|
| `xdr decode [INPUT]...` | Decodes XDR. `--type <TYPE>` required. `--input <single\|single-base64\|stream\|stream-base64\|stream-framed>` (default `stream-base64`). `--output <json\|json-formatted\|text\|rust-debug\|rust-debug-formatted>` (default `json`). |
| `xdr encode [INPUT]...` | Encodes XDR. `--type <TYPE>` required. `--input <json>` (only value). `--output <single\|single-base64\|stream>` (default `single-base64`). |
| `xdr guess [INPUT]` | Lists candidate types an XDR value could decode into. `--certainty <CERTAINTY>` (default `2`). |
| `xdr compare --type <TYPE> <LEFT> <RIGHT>` | Compares two XDR files of the same type. Prints `-1`, `0`, or `1`. |
| `xdr types list` | Lists every known XDR type name. `--output <plain\|json\|json-formatted>` (default `plain`). |
| `xdr types schema --type <TYPE>` | Generates a JSON schema for one type. |
| `xdr types schema-files --out-dir <OUT_DIR>` | Writes a JSON schema file per type to a directory. |
| `xdr generate {default, arbitrary}` | Generates default or arbitrary XDR values. |
| `xdr xfile preprocess` | Evaluates `#ifdef`/`#ifndef`/`#elif`/`#else`/`#endif` directives in an XDR `.x` file. |
| `xdr version` | Prints XDR schema version information. |

## `stellar strkey`

Read-only. `strkey decode <STRKEY>` and `strkey encode <JSON>` emit JSON only, with no text mode.
A decoded `G…` address comes back as `{"public_key_ed25519": "<hex>"}`. `strkey zero <public_key_ed25519|pre_auth_tx|hash_x|muxed_account_ed25519|signed_payload_ed25519|contract|liquidity_pool|claimable_balance_v0>` generates the zero value for a strkey type, with `--output <strkey|json>` (default `strkey`). `strkey version` prints version information.

## `stellar container`

Starts local networks in containers.

### `stellar container start [NETWORK]`

Mutates local Docker state. `NETWORK` is `local`, `testnet`, `futurenet`, or `pubnet`, default
`local`.

| Flag | Required | Description |
|---|---|---|
| `-d, --docker-host <DOCKER_HOST>` | No | Overrides the default Docker host path. Env `DOCKER_HOST`. |
| `--engine <docker\|apple-container>` | No | Default `docker`. Env `STELLAR_CONTAINER_ENGINE`. |
| `--cpus <CPUS>` | No | Whole number only for Apple's `container` engine. |
| `--memory <MEMORY>` | No | For example `2g` or `512m`. |
| `--name <NAME>` | No | Container name. |
| `-l, --limits <LIMITS>` | No | Limits, for the `local` network only. |
| `-p, --ports-mapping <PORTS_MAPPING>...` | No | `HOST_PORT:CONTAINER_PORT`. Default `8000:8000`. |
| `-t, --image-tag-override <IMAGE_TAG_OVERRIDE>` | No | Overrides the default image tag for the network. |
| `--protocol-version <PROTOCOL_VERSION>` | No | For the `local` network only. |

Without arguments, `container start` runs the equivalent of `docker run --rm -p 8000:8000 --name
stellar stellar/quickstart:latest --testnet --enable rpc,horizon`.

### `stellar container stop [NAME]` / `stellar container logs [NAME]`

Mutates local Docker state / read-only. `NAME` defaults to `local`. Same `--docker-host` and
`--engine` flags as `start`.

### `stellar container use <ENGINE>` / `stellar container unset`

Mutates local config. Sets or clears the default container engine.

## `stellar plugin`

### `stellar plugin ls`

Read-only. Lists installed plugins, discovered as `stellar-<name>` binaries on `PATH`.

### `stellar plugin search`

Read-only network call. Searches GitHub for CLI plugins.

## `stellar completion`

Read-only. `--shell <bash|elvish|fish|powershell|zsh>` (required). Prints shell completion code:

```bash
source <(stellar completion --shell bash)
```

## `stellar version`

Read-only. `--only-version`, `--only-version-major`, `--only-commit` each narrow the output to
one field.

## `stellar skill`

**main build only.** Absent from the 28.0.0 release, where it exits `2` with `error: unrecognized
subcommand 'skill'`.

Read-only, no flags, no network call. Prints a 128-line Markdown guide to stdout that tells an AI
agent how to drive the CLI idiomatically. It is a static document compiled into the binary, not
generated from the command tree, so it does not enumerate the full surface and it does not reflect
your local config.

```bash
stellar skill > stellar-cli-skill.md
```

What it covers: `network use` and `keys use` instead of repeating flags, contract aliases instead of
shell variables holding contract IDs, `--send=no` for reads, the stdout-versus-stderr split, TTL and
archival, and `container start local`. What it does not cover: the `stellar token` family, `tx new`,
SEP-53 message signing, mainnet, or anything about spend authority.

That last gap is the reason to read it alongside these pages rather than instead of them. It is a
conventions guide for a contract developer's agent, not a safety or payments guide. See
[Skills](../skills.md) for how it relates to the Stellar CLI skill package.

## Related pages

- [Architecture](architecture.md)
- [Authority model](authority-model.md)
- [Output and errors](output-and-errors.md)
- [Supported networks](supported-networks.md)
- [Quickstart](../quickstart.md)
