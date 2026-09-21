---
description: Read balances and token metadata with `stellar token balance`, `name`, `symbol`, and `decimals`, no key required.
keywords: [Stellar, agent, balance, token metadata, decimals, CLI]
---

# Check balances and metadata

Ask what an account holds, and what an unfamiliar token actually is, before touching it.

**Build note:** `token name`, `symbol`, `decimals`, `approve`, and `allowance` are merged but not
in the 28.0.0 release, so they need a build from `main`. Bare `stellar` resolves to the release on
most machines. See [Quickstart step 1](../quickstart.md).

Nothing here moves money or needs a key, so these are the safest commands in the CLI and the right
first thing to run when you suspect something is misconfigured. They are also the only commands
that work from a completely fresh install with nothing set up.

`stellar token balance`, `name`, `symbol`, and `decimals` are reads, not transactions. They need no
key, no funded account, and no signing, because they run as simulations rather than signed
operations. That is true on testnet from a fresh install. Mainnet is not: the built-in `mainnet`
entry ships as a placeholder rather than a real RPC URL, so these commands fail on mainnet with
`Invalid URL Bring Your Own: ...` until you add a real endpoint:

```bash
stellar network add mainnet \
  --rpc-url <YOUR_MAINNET_RPC_URL> \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

Stellar's [RPC providers page](https://developers.stellar.org/docs/data/apis/rpc/providers) lists the endpoints to choose from. The public
`https://mainnet.sorobanrpc.com` needs no signup and is enough for reads.

USDC's testnet id is `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. The examples
below use it.

**Skill:** `references/token.md` in the [Stellar CLI skill package](../skills.md) is the agent-facing version
of this page.

## Ask your agent

```text
What are the decimals and symbol for USDC on Stellar testnet, and what does agent-1 hold of it?
```

## Steps

1. Identify an unfamiliar asset before you touch it:

   ```bash
   stellar token name --id <TOKEN> --network <NETWORK>
   stellar token symbol --id <TOKEN> --network <NETWORK>
   stellar token decimals --id <TOKEN> --network <NETWORK>
   ```

2. Read a balance:

   ```bash
   stellar token balance --id <TOKEN> --account <ACCOUNT> --network <NETWORK>
   ```

3. Add `--decimal` for a human-readable amount, or leave it off for the raw smallest-unit value you
   would feed back into `--amount` on a transfer:

   ```bash
   stellar token balance --id <TOKEN> --account <ACCOUNT> --network <NETWORK> --decimal
   ```

## Two output quirks

For a Stellar Asset Contract, `name` returns the full `CODE:ISSUER` string, not a friendly name.
For the native asset, both `name` and `symbol` return the literal string `native`. Neither is a
bug. There is no separate metadata registry backing these reads, so the contract answers with what
it actually stores.

## Raw units versus decimal

Without `--decimal`, `balance` returns the token's smallest unit as an integer string. With
`--decimal`, it divides by the token's own `decimals` and returns a human-readable number. Use the
raw form whenever the value is going back into `--amount` on `transfer` or `approve`. Use
`--decimal` only for display.

## A native balance is not the spendable amount

`stellar token balance --id native` reports the account's full ledger balance. Stellar holds part
of that as the base reserve plus a reserve per subentry, so the spendable figure is lower. Sending
the entire reported balance fails at simulation with `Error(Contract, #10)`,
`"resulting balance is not within the allowed range"`, confirmed on testnet. That same code also
covers an ordinary insufficient balance, so treat it as "this account cannot part with that
amount" rather than "this balance is wrong". Leave reserve and fee headroom.

## What these reads cannot do

There is no command that lists what an account holds. Every read names one token, so "what does
this account hold" is not a question this CLI answers; enumerating an account's trustlines means
querying Horizon. Reframe the request as "how much of these specific tokens", and get the token
list from the user.

`--account` accepts a `G…` address, a `C…` contract address, or a saved alias, so a contract's
holdings are readable the same way an account's are.

## Machine-readable output

`--output json` wraps each read in an object keyed by the command, for example `{"decimals":7}` or
`{"balance":"99999988251"}`. `--output json-formatted` is the same object, pretty-printed.

It is not always a single key. `--decimal` adds a second one:
`token balance --decimal --output json` returns `{"balance":"9999.9988251","decimals":7}`, and
`token allowance --decimal --output json` returns `{"allowance":"0.00001","decimals":7}`. A parser
that assumes one key, counts keys, or reaches for the first entry breaks the moment someone adds
`--decimal`.

## Common pitfalls

A bad token id fails with a `config`-typed error, not a balance of zero:

```console
$ stellar token balance --id nonexistent_bad_id --account agent-1 --network testnet --output json
{"error":{"type":"config","message":"contract not found: nonexistent_bad_id"}}
```

Check the error type before trusting a balance of zero as real.

A balance read against an account that does not exist on the network at all fails differently from
one against an existing account with no trustline. The first is `Error(Contract, #6)`,
`"account entry is missing"`. The second, for a classic asset, is `Error(Contract, #13)`,
`"trustline entry is missing for account"`. Both arrive as `type:"invoke"`, and only the message
text tells them apart.

## Related pages

- [Send tokens](send-tokens.md)
- [Delegate spending](delegate-spending.md)
- [Quickstart](../quickstart.md)
- [Output and errors](../reference/output-and-errors.md)
