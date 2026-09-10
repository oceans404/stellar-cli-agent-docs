---
description: Which stellar commands support --output and which values each accepts, the token family's typed error envelope, and how every other command reports failure.
keywords: [Stellar, agent, CLI, output, errors, JSON, exit codes, stellar token]
---

# Output and errors

`--output` is declared per command, not globally. Each command picks its own value set, and the
default differs by command. There is no single `--output json` flag that works everywhere. The
`stellar token` family is the only part of the CLI with a typed, machine-parseable error envelope.
Every other command reports failure as unstructured text on stderr plus a non-zero exit code. Read
this page before you wire an agent to parse CLI output, because the coverage is not uniform and
guessing wrong costs a debugging session.

**Skill:** `references/errors.md` in the [Stellar CLI skill package](../skills.md) is the agent-facing version
of this page.

## Commands that support `--output`

Where a command takes all three, `text` is human-readable, `json` is a compact single line, and
`json-formatted` is that same JSON indented across multiple lines. Have your agent parse `json`
and keep `json-formatted` for output a person reads.

| Command | `--output` values | Default |
|---|---|---|
| `token balance`, `token transfer`, `token name`, `token symbol`, `token decimals`, `token approve`, `token allowance` | `text`, `json`, `json-formatted` | `text` |
| `tx fetch result`, `tx fetch meta`, `tx fetch events` | `json`, `json-formatted`, `xdr` (values vary per subcommand) | varies |
| `tx fetch fee` | `table`, `json`, `json-formatted` | `table` |
| `tx decode` | `json`, `json-formatted` | `json` |
| `tx encode` | `single-base64`, `single` | `single-base64` |
| `network health`, `network info` | `text`, `json`, `json-formatted` | `text` |
| `network settings` | `xdr`, `json`, `json-formatted` | `json` |
| `ledger latest`, `ledger fetch` | `text`, `json`, `json-formatted` | `text` |
| `fees stats`, `fee-stats` (deprecated) | `text`, `json`, `json-formatted` | `text` |
| `contract info interface`, `contract info meta`, `contract info env-meta` | `rust`, `text`, `xdr-base64`, `json`, `json-formatted` | `text` |
| `contract read` | `string`, `json`, `xdr` (`json` advertised but broken, see below) | `string` |
| `contract inspect` (deprecated) | `xdr-base64`, `xdr-base64-array`, `docs` | `docs` |
| `xdr decode` | `json`, `json-formatted`, `text`, `rust-debug`, `rust-debug-formatted` | `text` |
| `xdr encode` | `single`, `single-base64`, `stream` | `single-base64` |
| `events` | `pretty`, `plain`, `json`, `raw` | `pretty` |
| `snapshot create` | `json` only | `json` |

Three things worth knowing beyond the table:

- `strkey decode` and `strkey encode` emit JSON only. There is no `--output` flag and no text mode.
  A decoded `G...` address comes back as `{"public_key_ed25519": "<hex>"}`.
- `tx fetch fee` defaults to `table`, not `json`, unlike every other `tx fetch` subcommand. Pass
  `--output json` explicitly if your agent needs to parse it.
- **`json-formatted` is not JSON on any `tx fetch` subcommand.** All four prepend a human header to
  stdout, `Transaction Status: SUCCESS` and `Transaction Ledger: <N>`, with ANSI color codes around
  the status. `jq` fails on it while `--output json` parses cleanly, confirmed live on `result`,
  `meta`, `fee`, and `events`. Elsewhere, on the `token` family and `ledger`, `json-formatted` is
  ordinary indented JSON and parses. Use `json` whenever you intend to parse, and treat a parse
  failure here as a formatting choice, never as a failed transaction.
- None of the 22 `stellar tx new <operation>` commands has an `--output` flag at all, and a
  successful submission writes nothing to stdout. See
  [`tx new` has no machine-readable receipt](#tx-new-has-no-machine-readable-receipt) below.
- `contract read --output json` advertises JSON but does not emit it. See
  [`contract read --output json` is broken](#contract-read---output-json-is-broken) below.

## `contract read --output json` is broken

`--help` lists `string`, `json`, and `xdr` as the possible values for `contract read`'s `--output`.
`json` does not produce JSON. It produces CSV with a JSON-looking value embedded in a doubled-quote
field, and it fails to parse as JSON:

```console
$ stellar contract read --id increment --network testnet --output json | head -1
"""ledger_key_contract_instance""","{

$ stellar contract read --id increment --network testnet --output json | python3 -c 'import sys,json;json.load(sys.stdin)'
json.decoder.JSONDecodeError
```

Do not pipe `contract read --output json` straight into a JSON parser. Either parse it as CSV, or
use `--output xdr` and decode the result yourself with `stellar xdr decode`.

## `tx new` has no machine-readable receipt

`stellar tx new payment --help`, and every other `tx new <operation> --help`, has no `--output`
flag. A submitted operation writes nothing to stdout on success. The transaction hash appears only
on an `ℹ️  Signing transaction: <HASH>` stderr line, and `--quiet` removes that line along with
everything else on stderr.

Contrast this with `token transfer`, which prints the bare hash as its last stdout line and supports
`--output json` directly. `tx new` has no equivalent of either.

To get a parseable result from a `tx new` operation, split the pipeline and read the result from
`tx send`, which does return JSON:

```bash
stellar tx new payment --source <IDENTITY> --destination <ADDRESS> --amount <N> --build-only --network <NET> \
  | stellar tx sign --sign-with-key <IDENTITY> --network <NET> \
  | stellar tx send --network <NET>
```

`tx send`'s JSON has top-level keys `status`, `ledger`, `application_order`, `fee_bump`, `tx_hash`,
`created_at`, `envelope`, `result`, `result_meta`, and `events`. `status` is `SUCCESS` on success.
The hash field is `tx_hash`, not `hash`.

## The token family's error envelope

`stellar token` commands wrap a failed call in a single JSON object with a `type` discriminator, so
an agent can branch on the failure class without parsing prose:

```console
$ stellar token balance --id nonexistent_bad_id --account agent-1 --network testnet --output json
{"error":{"type":"config","message":"contract not found: nonexistent_bad_id"}}
```

A well-formed but nonexistent `C…` address returns the same `config` type, not `contract_not_found`:

```console
$ stellar token balance --id CBIELTK6…QDAAA --account agent-1 --network testnet --output json
{"error":{"type":"config","message":"contract not found: CBIELTK6…QDAAA"}}
```

```console
$ stellar token transfer --id USDC:GBBD47IF… --from agent-1 --to doc-probe \
    --amount 500000 --network testnet --output json
{"error":{"type":"invoke","message":"transaction simulation failed: HostError: Error(Contract, #13)\n\nEvent log (newest first):\n   0: [Diagnostic Event] … data:[\"trustline entry is missing for account\", GCBNIXOH…]\n…"}}
```

Known `type` values, from the `token` command source:

| `type` | Meaning |
|---|---|
| `sac_not_deployed` | The Stellar Asset Contract for this classic asset has not been deployed yet. The error carries a hint pointing at `stellar contract asset deploy --asset <ASSET> --source-account <IDENTITY>`. `--source-account` is required on that command; the hint does not run without it. |
| `contract_not_found` | Defined in the `token` command source, but not reached through the `token` commands in testing. A nonexistent contract address returned `config` instead (see above). Do not rely on this type to detect a missing contract. |
| `config` | A resolution or configuration problem: an unparseable `--id`, an unknown alias, or a well-formed but nonexistent `C…` contract address. This, not `contract_not_found`, is the type you actually get for a missing contract, with `message: "contract not found: <ID>"`. |
| `network` | The RPC endpoint could not be reached or returned a network-level failure. |
| `invalid_address` | A `--from`, `--to`, `--spender`, or `--account` value is not a valid address. `--account` is the one that matters for reads: an unknown alias returns `Account alias "<NAME>" not Found`. |
| `invoke` | The contract call itself failed during simulation or submission. Check the `message` field's embedded diagnostic event log for the actual cause. Two you will meet often: `Error(Contract, #13)`, `"trustline entry is missing for account"`, for a classic asset with no trustline or no account at all; and `Error(Contract, #6)`, `"account entry is missing"`, for the native asset with no account at all. Both are `invoke`, so you cannot branch on `type` alone to tell them apart. |
| `internal` | An unexpected CLI-internal error. |

Both example calls above exit `1`.

## Everything else prints unstructured stderr text

Outside the `token` family, a failing command prints a plain `❌ error: ...` line to stderr. There
is no `type` field and no stable schema to parse. Two real examples:

```console
$ stellar strkey decode <MALFORMED_INPUT>
❌ error: Encoded text cannot have a 6-bit remainder.
```

```console
$ stellar message verify "tampered message" --public-key GDCINM7O… --signature Z34PcX58…
❌ Signature invalid
❌ error: Signature verification failed
```

An agent working against the rest of the CLI has to rely on the exit code and on matching
substrings in stderr text. There is no discriminated error type outside `token`. This is the main
obstacle to programmatic error handling in the CLI today, and it is worth flagging to your agent's
error-handling logic explicitly rather than assuming every command behaves like `token`.

## Exit codes

`0` means success. Any non-zero exit means failure. The CLI does not use exit codes to distinguish
failure classes beyond that binary.

`stellar message verify` is a clean, verified example of both paths:

```console
$ stellar message verify "agent-session-2026-09-09" \
    --public-key GDCINM7OFENANN2Y73MSU74DWDZXLAXX7KMP3J4NH67IPKWWIUF33KAH \
    --signature Z34PcX58nb+1CwrwM53uqYKk+/jcb5o5RfhhtsLEOpVQbiumbactxQpEnyTgDwMeUQbHMAqKb/StewzBhW7wDg==
ℹ️  Verifying signature against: GDCINM7OFENANN2Y73MSU74DWDZXLAXX7KMP3J4NH67IPKWWIUF33KAH
✅ Signature valid
```

Exit code `0`. On a tampered message, the same command exits `1` with `❌ Signature invalid`
followed by `❌ error: Signature verification failed`. Check the exit code first. Don't rely on
matching the emoji-prefixed line alone, since that line's exact text is not guaranteed stable across
versions.

## Success shapes

A mutating `token` command in JSON mode returns a fixed two-field object:

```json
{"tx_hash":"cdbfa12f54d40d3c1f3b3a4c64cecd93f7a3dcc16574fe00bf1f2f557f65e78a","result":null}
```

`token approve` returns the same shape. `result` is `null` on these calls; it is not populated with
contract return data by `transfer` or `approve`.

A read-only `token` command in JSON mode returns an object keyed by the command:

```json
{"balance":"99999988251"}
{"decimals":7}
{"allowance":"250000000"}
{"name":"native"}
{"symbol":"native"}
```

Adding `--decimal` adds a second key rather than replacing the first, so do not write a parser that
assumes exactly one:

```json
{"balance":"9999.9988251","decimals":7}
{"allowance":"0.00001","decimals":7}
```

In text mode, the same reads return a bare value with no wrapping:

```console
$ stellar token decimals --id USDC:GBBD47IF… --network testnet
7
```

`--decimal` on `token balance` divides by the token's own `decimals` before printing. Without it,
you get the raw smallest-unit integer, which is what you want when feeding the value straight back
into `--amount` on a later command.

## Practical guidance

`--quiet` deletes stderr on a non-token command, error message included. It is not just quieter
logging: on a failing non-token command, `--quiet` leaves you with the exit code and nothing else,
zero bytes on stderr, confirmed live. Use `--quiet` only when the exit code is all you need. If you
need to know why something failed, omit `--quiet` and capture stderr instead.

The `token` family is safe either way, because its error is JSON on stdout, not stderr, and
`--quiet` does not touch stdout. In JSON mode the `token` family writes nothing to stderr at all,
measured on both a successful and a failing `token transfer`, so `--quiet` is redundant there
rather than necessary. Combine `--quiet` with `--output json` on `token` commands for
clean, parseable stdout with no informational logging (`ℹ️  Simulating transaction…`,
`🌎 Sending transaction…`, `✅ Transaction submitted successfully!`, the `🔗` explorer link) mixed
in. Do not reach for `--quiet` as a default on every command; it is a tradeoff, not a free clean-up.

**Never merge stderr into stdout when you intend to parse the result.** This is the same class of
hazard as `--quiet`, and it is the one that actually causes damage. `stellar tx send` writes an
informational line to stderr (`ℹ️  Transaction hash is <HASH>`, or `ℹ️  Signing transaction: <HASH>`
when the command is `token transfer`) and its JSON receipt to stdout,
separately. `2>&1`, the default habit of most agent tooling, interleaves the two streams and breaks
the JSON:

```console
$ … | stellar tx send --network testnet 2>/dev/null
{"status":"SUCCESS", …}

$ … | stellar tx send --network testnet 2>&1
ℹ️  Transaction hash is d9a2ae81f886c9b5cde637a282424eb1a8eb88c741aee5857a744cd29994ba…
{"status":"SUCCESS", …}
```

The second form fails to parse. This is not a cosmetic bug: an agent that treats a parse failure as
a submit failure and retries has just resubmitted a transaction that already succeeded. That is a
confirmed double-spend, not a hypothetical one. A failed parse is not evidence the transaction
failed.

One exception to the recovery route, and it is the mode most agents run in: `token transfer
--output json` writes **nothing at all to stderr**, on success and on failure alike, measured on
testnet. There is no `ℹ️  Signing transaction:` line to fall back on, so the hash exists only in
stdout's `tx_hash`. If that stdout is empty or unparseable, you have no local record of the hash.
Do not retry. Re-read both balances, and go to Horizon if you need the hash itself.

Redirect stderr separately, never merged, whenever you intend to parse stdout. Capture it to a file
rather than discarding it, because for `tx send` the hash you need to confirm on-chain state lives
on that stderr line:

```bash
stellar tx send --network <NET> 2>send.stderr
```

Before retrying any submit that appears to have failed, confirm it did not already land:

```bash
stellar tx fetch result --hash <HASH> --network <NET>
```

Only retry once you have confirmed the transaction is not already on-chain.

In text mode, a submitted transfer prints the bare transaction hash as the last line of stdout:

```console
$ stellar token transfer --id native --from agent-1 --to doc-probe --amount 10000000 --network testnet
ℹ️  Simulating transaction…
ℹ️  Signing transaction: 11659a52651dc9ba60dc422dc890abe17ab11c68ec4b976348398987c873df7e
🌎 Sending transaction…
✅ Transaction submitted successfully!
🔗 https://stellar.expert/explorer/testnet/tx/11659a52651dc9ba60dc422dc890abe17ab11c68ec4b976348398987c873df7e
11659a52651dc9ba60dc422dc890abe17ab11c68ec4b976348398987c873df7e
```

Capture it directly with command substitution:

```bash
TX=$(stellar token transfer --id native --from agent-1 --to <ADDRESS> --amount 10000000 --network testnet)
```

## Telling `#13` from `#6`

`#6` `"account entry is missing"` comes only from a native query and unambiguously means the account
does not exist. `#13` `"trustline entry is missing for account"` comes from a classic-asset query and
is ambiguous: a funded account with no trustline and a nonexistent account both produce it.

To disambiguate, query the native balance of the same address:

```bash
stellar token balance --id native --account <ADDRESS> --network <NET> --output json
```

`#6` means the account does not exist, so run `stellar keys fund <NAME> --network testnet`. A number
means the account exists and only needs a trustline.

## Related pages

- [Quickstart](../quickstart.md)
- [Troubleshooting](../troubleshooting.md)
- [Authority model](authority-model.md)
