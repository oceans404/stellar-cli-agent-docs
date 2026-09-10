---
description: Grant and audit capped, expiring spend authority with `stellar token approve` and `stellar token allowance`.
keywords: [Stellar, agent, allowance, approve, delegated spending, authority]
---

# Delegate spending

`stellar token approve` grants an address a capped, expiring allowance to move a token out of your
account. `stellar token allowance` reads what is currently granted. Together they are the closest
thing the Stellar CLI has to a spend limit, and the network enforces the cap, not the agent's good
behavior.

This page's examples use testnet USDC, `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`,
which is 7 decimals. 25 USDC is `250000000`.

Two identities appear below. `treasury` is the funded account that holds the USDC and is where the
money comes from. It is the account you keep control of, and your agent cannot sign for it.
`agent-1` is your agent's own key, created in the [Quickstart](../quickstart.md), and it holds
nothing. The point of this page is to let `agent-1` spend a capped amount out of `treasury` without
ever holding `treasury`'s key.

**Skill:** `workflows/delegate-spending.md` and `workflows/audit-and-revoke-allowances.md` in the [Stellar CLI skill package](../skills.md) is the agent-facing version
of this page.

## Ask your agent

```
Grant agent-1 an allowance of 25 USDC from treasury on testnet USDC, expiring in about a day, then
show me the allowance.
```

## Steps

1. Read the current ledger. `--expiration-ledger` is a ledger number, not a duration, so you need
   this first:

   ```bash
   stellar ledger latest --network <NETWORK> --output json
   ```

2. Convert your desired duration to ledgers. Both testnet and mainnet close a ledger roughly every
   5 seconds, so a day is about 17280 ledgers. There is no `--expires-in` flag. You compute the
   target ledger yourself: current ledger plus that count.

   Write the number down. `approve` echoes it back as `live_until_ledger` in its event line, and
   that is the only time the CLI will ever show it to you: `token allowance` returns the amount
   alone, with no way to read an existing grant's expiration.

3. Grant the allowance:

   ```bash
   stellar token approve --id <TOKEN> --from <OWNER> --spender <SPENDER> \
     --amount <AMOUNT> --expiration-ledger <LEDGER> --network <NETWORK>
   ```

4. Confirm what is actually granted. Do not trust what you just sent:

   ```bash
   stellar token allowance --id <TOKEN> --from <OWNER> --spender <SPENDER> --network <NETWORK>
   ```

## Spending the allowance

`stellar token` has no verb that draws on an allowance. There is no `transfer-from`, and running
`stellar token transfer --from <OWNER> --sign-with-key <SPENDER>` fails with
`{"error":{"type":"invoke","message":"...TxBadAuth..."}}`, because the transfer itself is still
authorized by the owner, not the spender.

The Stellar Asset Contract itself exposes `transfer_from`, authorized by the spender. `--to` needs a
trustline for the asset, exactly like an ordinary transfer; without one this fails with
`Error(Contract, #13)`.

Drawing more than the allowance holds fails at simulation with `Error(Contract, #9)`, and nothing is
submitted. The diagnostic names both numbers, remaining first and requested second:

```console
❌ error: transaction simulation failed: HostError: Error(Contract, #9)
   0: [Diagnostic Event] topics:[error, Error(Contract, #9)], data:["not enough allowance to spend", 210000000, 220000000]
```

That is the cap doing its job. It is enforced by the network, not by the agent's restraint, which is
the whole reason to use an allowance instead of trusting a spending limit you wrote into a prompt.

`contract invoke --id` is stricter than `token --id`: it takes only a `C...` contract address or an
alias, not `CODE:ISSUER`, so resolve the address first. `contract id asset` is a pure read and needs
no source account:

```bash
SAC=$(stellar contract id asset --asset <CODE:ISSUER> --network <NETWORK>)
stellar contract invoke --id "$SAC" --source <SPENDER> --network <NETWORK> \
  -- transfer_from \
  --spender <SPENDER_ADDRESS> \
  --from <OWNER_ADDRESS> \
  --to <DESTINATION> \
  --amount <SMALLEST_UNIT>
```

`--source` is the spender's identity, and it signs. The allowance is reduced by the amount
transferred. Read it back with `stellar token allowance` afterward, the same way you would after
granting it.

## Amount replaces, it does not add

`--amount` on `approve` replaces the existing allowance. It does not add to it. Granting 10 after
already granting 25 leaves the allowance at 10, not 35. The safe update pattern is read-then-replace:
read the current allowance with `allowance`, decide the new total you want outstanding, then call
`approve` with that total.

## Revocation

Revoke by approving zero: `--amount 0 --expiration-ledger 0`. Zero is the one case where the
expiration ledger is allowed to be in the past, because a zero allowance has nothing left to expire.

## The spender can be a contract

`--spender` accepts a `C...` contract address as well as a `G...` account. A policy contract that
enforces its own rules on top of the allowance can sit in the spender position.

## What this does not give you

An allowance caps one spender's draw on one token from one owner, with a ledger deadline. It gives
no rolling time window, no per-counterparty rule beyond that single spender, no allow-list of
destinations the spender can pay out to, and no fiat-denominated limit. It has no notion of an
agent session either: an allowance outlives however long you intended the agent to run, until its
expiration ledger passes or you revoke it.

## Common pitfalls

Setting `--expiration-ledger` behind the current ledger, with a positive amount, is rejected. Fetch
the current ledger first and add your ledger count to it. Do not guess.

## Related pages

- [Send tokens](send-tokens.md)
- [Check balances and metadata](check-balances-and-metadata.md)
- [Authority model](../reference/authority-model.md)
- [Quickstart](../quickstart.md)
