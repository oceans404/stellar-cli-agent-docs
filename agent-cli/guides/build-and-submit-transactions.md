---
description: Build unsigned transactions with `--build-only`, sign and inspect them offline, then submit with `stellar tx`.
keywords: [Stellar, agent, build-only, tx, sign, simulate, XDR]
---

# Build and submit transactions

Every `tx new <OPERATION>` and every `contract` command accepts `--build-only`, which stops before
signing and submitting. It still contacts RPC to read the source account's sequence number, so
building needs network access and a funded source account. Signing and submitting are the two steps
it actually skips. `token transfer` and `token approve` do not accept `--build-only` at all; for a
build-only payment handoff, use `stellar tx new payment --build-only` instead of `token transfer`.
Every `stellar tx` subcommand reads XDR from stdin when you do not pass it as an argument, so build,
sign, and send compose into a pipeline.

**Skill:** `workflows/air-gapped-signing.md` in the [Stellar CLI skill package](../skills.md) is the agent-facing version
of this page.

## Ask your agent

```
Build a payment from agent-1 to <ADDRESS> for 10 XLM without submitting it, then show me the unsigned XDR.
```

## Steps

1. Build, on a machine with network access:

   ```bash
   stellar tx new payment --source <SOURCE> --destination <ADDRESS> --amount <AMOUNT> \
     --network <NETWORK> --build-only
   ```

   This prints unsigned base64 XDR to stdout and exits. It contacts RPC to read the source
   account's sequence number, but nothing is signed and nothing is submitted.

2. Sign it. This step needs no RPC connection, so it is the one stage you can run offline. Always
   pass `--network` or `--network-passphrase` on this stage:

   ```bash
   stellar tx new payment --source <SOURCE> --destination <ADDRESS> --amount <AMOUNT> \
     --network <NETWORK> --build-only \
     | stellar tx sign --sign-with-key <SOURCE> --network <NETWORK>
   ```

   A signature commits to the network passphrase. An unqualified `tx sign` falls back to the saved
   default network, which can silently be the wrong one and produces a valid-looking envelope that
   fails to submit.

3. Submit the signed envelope, back on a machine with network access:

   ```bash
   stellar tx new payment --source <SOURCE> --destination <ADDRESS> --amount <AMOUNT> \
     --network <NETWORK> --build-only \
     | stellar tx sign --sign-with-key <SOURCE> --network <NETWORK> \
     | stellar tx send --network <NETWORK>
   ```

## Parsing the result

`tx new <OPERATION>` has no `--output` flag and writes nothing to stdout on success. The
transaction hash appears only in the `ℹ️  Signing transaction: <HASH>` line on stderr, and `--quiet`
removes that line along with everything else. This is not like `token transfer`, which prints the
bare hash as its last stdout line and does support `--output json`.

To get a parseable receipt, let `tx send` produce it rather than trying to scrape an earlier stage.
`tx send`, the last stage of the pipeline in step 3 above, always returns JSON with top-level keys
`status`, `ledger`, `application_order`, `fee_bump`, `tx_hash`, `created_at`, `envelope`, `result`,
`result_meta`, and `events`. On success `status` is `SUCCESS`. The hash field is `tx_hash`, not
`hash`.

Never merge stderr into stdout here. `tx send` writes `ℹ️  Transaction hash is <HASH>` to stderr and
the JSON receipt to stdout; `2>&1` interleaves them and breaks the parse. A failed parse is not
evidence of failure. The transaction may have already succeeded. Confirm with
`stellar tx fetch result --hash <HASH> --network <NETWORK>` before retrying. Capture stderr to a
file rather than discarding it; the hash you need for that check is only there.

## Inspection before signing

Base64 XDR is not human-readable. Showing someone `AAAAAgAAAABfEbrRS/av…` and calling it an
approval step is not an approval step: they cannot see the destination, the amount, or whether
anything has already signed it. Render the envelope first:

```bash
stellar tx new payment --source <SOURCE> --destination <ADDRESS> --amount <AMOUNT> \
  --network <NETWORK> --build-only | stellar tx decode --output json-formatted
```

That prints `source_account`, `fee`, `seq_num`, `cond` (the timebounds, `"none"` if there are
none), the `operations` array, and `signatures: []` on an unsigned envelope. Those fields are what
a reviewer actually needs. `tx decode` needs no RPC connection.

`stellar tx hash` then computes the envelope's hash without signing or submitting, also from stdin
and also offline. Use it to confirm the thing you approved is the thing you are about to sign:

```bash
stellar tx new payment --source <SOURCE> --destination <ADDRESS> --amount <AMOUNT> \
  --network <NETWORK> --build-only | stellar tx hash --network <NETWORK>
```

The hash is unchanged by signing, so the same value should come back after `tx sign` and from the
network on submit.

Check the destination while you are still at the build stage. A native `payment` cannot create an
account, so paying an address that has never been funded fails at submit with
`TxFailed` / `OpInner(Payment(NoDestination))` and exit code 1. In this flow that is the worst place
to find out, because a human has already reviewed and approved the envelope. `stellar token balance
--id native --account <ADDRESS> --output json` answers it for free, and `tx new create-account` is
the operation for an account that does not exist yet.

## Air-gapped signing

Only `tx sign` and `tx hash` are genuinely offline. `--build-only` still needs RPC to read the source
account's sequence number, so building cannot happen on a machine with no network access. The real
split is three stages across as many machines as you want: build on a networked machine, sign on an
offline machine, submit from a networked machine. Move only the unsigned XDR to the offline machine,
sign it there, then move only the signed XDR back. The signing key never touching a networked
machine is the actual security property, not that the whole pipeline avoids the network.

## Soroban paths need a simulation step

A Soroban invocation's resource footprint depends on what the contract does, so
`stellar tx simulate --source-account <SOURCE>` runs the transaction against current ledger state
and returns the resource fee and footprint it would need, without submitting. `contract invoke` runs
this simulation for you automatically. Composing your own `tx new` pipeline for a Soroban call means
running `simulate` yourself before `send`.

## 22 operations, one reference page

`stellar tx new <OPERATION>` covers 22 operations, from `payment` and `create-account` to DEX and
sponsorship operations. Each shares this same build, sign, send composition and adds its own flags on
top. See the [commands reference](../reference/commands.md) for the full operation list rather than
memorizing it here.

## Common pitfalls

A pipeline breaks silently if an earlier stage fails but still writes something to stdout. Check the
exit code of each stage, or run the pipeline one stage at a time the first time you compose it.

`tx send` can fail with `TxBadSeq`. The sequence number is fixed at build time, step 1, not at
submit time, step 3. Anything else signing for the same source account in between, a concurrent
agent or another one of your own commands, makes the envelope stale before it reaches step 3.
Rebuild from step 1 and re-sign; there is no way to patch an existing envelope's sequence number.
This is the natural failure mode of splitting build, sign, and send apart, and the air-gapped
variant is most exposed to it, since minutes or hours can pass in between. Elapsed time alone is
not the cause: only another transaction from the same source account advances the sequence. A long
delay is harmless unless the envelope carries timebounds, which `tx decode` shows as `cond`.

## Related pages

- [Send tokens](send-tokens.md)
- [Delegate spending](delegate-spending.md)
- [Authority model](../reference/authority-model.md)
- [Quickstart](../quickstart.md)
