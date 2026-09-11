---
description: Send the native asset or a classic asset with `stellar token transfer`, and confirm what shipped.
keywords: [Stellar, agent, token transfer, payments, CLI]
---

# Send tokens

Send someone tokens and confirm the money arrived. On testnet this takes about a minute.

Moving the tokens is one command. The work is getting the amount right, because the CLI counts in
the token's smallest unit rather than the number a person would say out loud, and making sure the
destination is able to hold the asset at all.

`stellar token transfer` moves the native asset or any classic asset to a recipient in one command.
`--amount` is always the token's smallest unit, not a human-readable number; see Amounts are
smallest units below before you convert one.

**Skill:** `workflows/send-tokens.md` in the [Stellar CLI skill package](../skills.md) is the agent-facing version
of this page.

## Ask your agent

```
Send 25 USDC from agent-1 to <ADDRESS> on testnet, then confirm the transaction went through.
```

## Steps

1. Identify the token. For the native asset, `--id native`. For a classic asset, `--id CODE:ISSUER`,
   for example `--id USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.

2. Confirm the destination can receive it (see Destination trustlines below), then send:

   ```bash
   stellar token transfer --id <TOKEN> --from <SOURCE> --to <ADDRESS> --amount <AMOUNT> --network <NETWORK>
   ```

3. Capture the transaction hash. It is the bare last line of stdout. `tx fetch result` takes it as
   `--hash`, not a positional argument:

   ```bash
   TX=$(stellar token transfer --id <TOKEN> --from <SOURCE> --to <ADDRESS> --amount <AMOUNT> --network <NETWORK>)
   stellar tx fetch result --hash "$TX" --network <NETWORK>
   ```

## Amounts are smallest units

`--amount` is always the token's smallest unit, not a human-readable decimal. `12500000` on a
7-decimal token is 1.25 of that token. Decimals differ per token. Never assume 7.

`stellar token decimals --id <TOKEN>` reads the real value.

## Destination trustlines

A classic asset needs a trustline on the destination account before that account can hold it.
`native` never needs one. Without one, on a destination account that otherwise exists, the transfer
fails at simulation with `Error(Contract, #13)`, "trustline entry is missing for account". If the
destination does not exist on the network at all, never funded, the error is different:
`Error(Contract, #6)`, "account entry is missing". Neither message names the fix directly. Fund an
unfunded destination with `stellar keys fund <NAME>`. Create a missing trustline from the
destination account first
(`stellar tx new change-trust --source <DESTINATION> --line <TOKEN>`), then retry the transfer. The
SAC's own `trust` function is a friendlier alternative, since the destination is invoking the
contract rather than composing a classic operation. `contract invoke --id` is stricter than
`token --id`: it takes only a `C...` contract address or an alias, not `CODE:ISSUER`, so resolve
the address first:

```bash
SAC=$(stellar contract id asset --asset <CODE:ISSUER> --network <NETWORK>)
stellar contract invoke --id "$SAC" --source <DESTINATION> --network <NETWORK> -- trust --addr <ADDRESS>
```

`contract id asset` is a pure read and needs no source account. `--addr` must be the same account
as `--source`; the contract requires that address to authorize its own trustline.

## Machine-readable output

`--output json` on `transfer` prints one object, `{"tx_hash": "...", "result": null}`, instead of
the human-readable log lines. Failures arrive in the same shape, wrapped as
`{"error": {"type": "...", "message": "..."}}`, so an agent can branch on `type` without parsing
prose.

## Common pitfalls

`--to` takes a `G...` address or a local identity name, not a contract alias unless that alias
resolves to one. An unfunded or nonexistent destination account fails at simulation with a
different error than a missing trustline, `Error(Contract, #6)` rather than `#13`, so do not assume
a trustline problem before checking which code you actually got. Either way, nothing is signed.

## Related pages

- [Check balances and metadata](check-balances-and-metadata.md)
- [Delegate spending](delegate-spending.md)
- [Quickstart](../quickstart.md)
- [Authority model](../reference/authority-model.md)
