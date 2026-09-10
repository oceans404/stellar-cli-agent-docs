---
description: Work with USDT0 on Stellar mainnet from the CLI. Addresses, trustlines, the clawback flags, and the liquidity reality before you move size.
keywords: [Stellar, USDT0, mainnet, USDT, LayerZero, OFT, trustline, clawback, liquidity]
---

# USDT0 on mainnet

USDT0 is USDT with a unified supply, bridged to Stellar by a LayerZero OFT contract that mints and
burns it here. It exists on mainnet only. There is no testnet USDT0, so every command on this page
moves real money.

Read [Liquidity is thin](#liquidity-is-thin) before you decide how to acquire it. That section is
the reason this page exists.

**Skill:** `workflows/acquire-an-asset.md` in the [Stellar CLI skill package](../skills.md) is the agent-facing version
of this page.

## Addresses

| Thing | Value |
|---|---|
| Classic asset | `USDT0:GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q` |
| Token contract (SAC) | `CBSJZEIO5C7KC2SF3MKSNXXJSW5G3VTNBX4ATMKUI3B2MR4JKM4R26YF` |
| OFT contract | `CBOWOLFSDM5PZXNFIVDMP5NZ7U2GSIHED6H6R446QOHF266XINKUMMF6` |
| Decimals on Stellar | 7 |

Do not trust a pasted contract address. Derive it and compare:

```bash
stellar contract id asset --asset USDT0:GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q \
  --network mainnet
```

That returns `CBSJZEIO5C7KC2SF3MKSNXXJSW5G3VTNBX4ATMKUI3B2MR4JKM4R26YF`, matching the published SAC.
`contract id asset` is a pure read and needs no source account, so this check costs nothing.

## Ask your agent

```
Check the USDT0 balance of GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q on mainnet,
then tell me what the current XLM to USDT0 rate is and how deep the market is.
```

## Set up mainnet first

Mainnet ships no RPC URL. Its built-in entry is a placeholder, so the first mainnet command on a
fresh install fails with `Invalid URL Bring Your Own`. Add an endpoint once:

```bash
stellar network add mainnet \
  --rpc-url <YOUR_MAINNET_RPC_URL> \
  --network-passphrase "Public Global Stellar Network ; September 2015"
stellar network health --network mainnet
```

Stellar's [RPC providers page](https://developers.stellar.org/docs/data/apis/rpc/providers) lists the endpoints to choose from, and the public
`https://mainnet.sorobanrpc.com` needs no signup. Read the next paragraph before you pick that one
for writes.

Pick the endpoint carefully, because a healthy one can still fail to submit. Measured live: the
identical `stellar token approve` command timed out twice against `https://mainnet.sorobanrpc.com`
with `{"error":{"type":"invoke","message":"transaction submission timeout"}}`, and Horizon confirmed
neither attempt landed. The same command against
`https://soroban-rpc.mainnet.stellar.gateway.fm` succeeded immediately.

Treat that as a reason to switch endpoints, not as a guarantee. An independent run on the same day
observed two Soroban submissions time out and then succeed on a third attempt while gateway.fm was
already the effective endpoint. Its data could not separate a flapping config from gateway.fm itself
being imperfect, and neither can mine. So a better endpoint reduces the failure rate and does not
remove it. Keep the retry discipline below regardless of which endpoint you use.

On the failing endpoint, Soroban reads worked, `network health` reported `✅ Healthy`, and classic
submissions (`create-account`, `change-trust`, `path-payment-*`) all landed. Only Soroban
submissions hung. So `network health` tells you the endpoint answers, not that it will complete a
contract invocation. Validate a new endpoint with one cheap Soroban write before you rely on it, and
remember that `stellar token` writes and `contract invoke` are Soroban while `tx new payment` is
classic.

Note that once you pass `--rpc-url`, you must pass `--network-passphrase` too. `--network` alone
will not supply it.

There is no friendbot on mainnet. `stellar keys fund` fails with
`Friendbot not found: Friendbot is not available on this network`. Fund a new account from an
existing one:

```bash
stellar tx new create-account --source <FUNDED_IDENTITY> --destination <NEW_ADDRESS> \
  --starting-balance 15000000 --network mainnet
```

Budget the reserves. Mainnet base reserve is 0.5 XLM, so an account needs 1 XLM to exist and 0.5
more per trustline. An account that will hold only USDT0 needs at least 1.5 XLM locked, plus a
little for fees. Fund below that and the trustline fails.

## Steps

1. Read the asset before you touch it. No key, no funded account, no signing:

   ```bash
   stellar token symbol   --id USDT0:GATISXX6… --network mainnet
   stellar token decimals --id USDT0:GATISXX6… --network mainnet
   ```

2. Add the trustline. USDT0 cannot arrive without one:

   ```bash
   stellar tx new change-trust --source <IDENTITY> \
     --line USDT0:GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q --network mainnet
   ```

3. Confirm the trustline exists. A numeric result, even `0`, means it worked:

   ```bash
   stellar token balance --id USDT0:GATISXX6… --account <IDENTITY> --network mainnet
   ```

   Without the trustline this fails with `Error(Contract, #13)`,
   `"trustline entry is missing for account"`.

4. Move it with a classic payment, in the smallest unit. At 7 decimals, 1 USDT0 is `10000000`:

   ```bash
   stellar tx new payment --source <IDENTITY> --destination <DEST> \
     --asset USDT0:GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q \
     --amount 10000000 --network mainnet
   ```

   The destination needs its own trustline first.

   `stellar token transfer` moves the same asset and is the more obvious command, but prefer the
   classic one above for a classic asset like USDT0. Measured on the same account in one session:
   the three Soroban transactions charged 14455, 14455, and 13755 stroops, while all seven classic
   operations charged 100 stroops each. That is roughly 140 times the fee for the same logical
   transfer, because `token transfer` routes through the Stellar Asset Contract and pays Soroban
   resource fees. In the same run, classic submissions succeeded 7 of 7 while `token transfer`
   succeeded 3 of 7.

   Use `token transfer` when you want its JSON receipt or when the token is contract-only with no
   classic asset behind it. For USDT0, neither applies.

## Liquidity is thin

USDT0 has real adoption and almost no on-DEX depth. Both are true and the gap matters.

Measured live: 12,892 accounts hold a USDT0 trustline, and 19 liquidity pools contain USDT0. The
only direct XLM pair is a pool holding **132.18 XLM against 23.51 USDT0**, at a 30bp fee. Every
other pool pairs USDT0 with a small token. Added up, total pooled USDT0 across all 19 is on the
order of 100 USDT0.

That depth sets a hard ceiling on swapping. Effective rate against size, measured live:

| You send | You get | Rate vs baseline |
|---|---|---|
| 1 XLM | 0.1777223 USDT0 | baseline |
| 100 XLM | 17.7709239 USDT0 | flat |
| 1,000 XLM | 177.7223 USDT0 | +0.01% |
| 5,000 XLM | 237.5100 USDT0 | **-73%** |
| 25,000 XLM | 23.3821 USDT0 | **-99.5%** |

The cliff sits between 1,000 and 5,000 XLM. Past it you are paying most of your money to move a
shallow pool, and the transaction still succeeds, so nothing stops you.

**So swap only for small amounts, and bridge for anything real.** USDT0 reaches Stellar through its
OFT contract, which is the intended route for size. Buying it on the Stellar DEX is fine for testing
and wrong for funding.

Always bound the trade. `--dest-min` makes a bad rate fail instead of execute:

```bash
stellar tx new path-payment-strict-send --source <IDENTITY> --network mainnet \
  --send-asset native --send-amount 50000000 --destination <OWN_ADDRESS> \
  --dest-asset USDT0:GATISXX6… --dest-min 8000000
```

The CLI has no price, depth, or orderbook command, so `--dest-min` is your only protection. Price
the trade first against Horizon's path endpoint, then set the bound below what it quoted.

One path-finding quirk to know. Pricing the exit with `strict-send` and USDT0 as the source asset
returns no paths at any size, which looks like there is no exit. There is. Use `strict-receive`
instead and it prices fine, at roughly 0.1789 USDT0 per XLM. Do not read an empty `strict-send`
result as absent liquidity.

## Capped delegation works on USDT0

You can grant another account a capped, expiring allowance over your USDT0 and the network enforces
the cap. This is the strongest control available for letting an agent spend a real stablecoin, and it
is verified working on mainnet.

It works even with a zero balance, so you can set the arrangement up before funding it:

```bash
LEDGER=$(stellar ledger latest --network mainnet --output json | python3 -c 'import sys,json;print(json.load(sys.stdin)["sequence"])')

stellar token approve --id USDT0:GATISXX6… --from <OWNER> --spender <AGENT> \
  --amount 20000000 --expiration-ledger $((LEDGER + 17280)) --network mainnet

stellar token allowance --id USDT0:GATISXX6… --from <OWNER> --spender <AGENT> \
  --network mainnet --decimal
```

That grants 2 USDT0 for roughly a day, since mainnet closes a ledger about every 5 seconds. Revoke
with `--amount 0 --expiration-ledger 0` and read back `0` to confirm. The owner needs a USDT0
trustline before either command works.

Spending against an allowance has no `stellar token` verb at all and requires
`contract invoke -- transfer_from`. See [Delegate spending](delegate-spending.md).

## The issuer can freeze or claw back

The asset sets `auth_revocable` and `auth_clawback_enabled`, confirmed live on its record. So the
administrator can revoke a trustline or claw back a balance already sitting in an account.

The administrator is not a keypair. Querying the SAC returns
`CA3GUWLOS3QKN6WNRAELSUDSKLDTVTWEDJ3KLGAJG3SIWGA5L3KZYWGJ`, a contract address, so that authority is
exercised programmatically by the USDT0 system rather than by a person holding a secret key:

```bash
stellar contract invoke --id CBSJZEIO5C7KC2SF3MKSNXXJSW5G3VTNBX4ATMKUI3B2MR4JKM4R26YF \
  --source <IDENTITY> --network mainnet --send no -- admin
```

You can see the flag on your own trustline, which is the check worth running before you accept a
meaningful balance:

```bash
curl -s "https://horizon.stellar.org/accounts/<YOUR_ADDRESS>" \
  | python3 -c 'import sys,json;[print(b) for b in json.load(sys.stdin)["balances"] if b.get("asset_code")=="USDT0"]'
```

Verified live on a real trustline, that returns `authorized=True` alongside
`clawback_enabled=True`.

**Cap your exposure with a trustline limit.** A trustline can carry a maximum, so the account
refuses anything above it rather than accepting an unbounded balance in an asset the issuer can claw
back. Verified working on mainnet:

```bash
stellar tx new change-trust --source <IDENTITY> \
  --line USDT0:GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q \
  --limit 10000000 --network mainnet
```

That sets a 1 USDT0 ceiling, readable back as `limit=1.0000000`. Omit `--limit` and it defaults to
the maximum, which is effectively uncapped. Setting `--limit 0` removes the trustline entirely and
returns the 0.5 XLM reserve, which only works at a zero balance.

This is normal for a regulated stablecoin and it is not a defect. It does mean a USDT0 balance is
not equivalent to holding XLM, and any product built on it should say so to its users.

## What a round trip actually costs

Measured live on mainnet, an independent test run did all of this: created two accounts, opened two
USDT0 trustlines, bought 0.3 USDT0 with a strict-receive path payment for 1.7138687 XLM, moved the
USDT0 to the second account, sold it back for 1.66 XLM, closed the trustline, and merged the second
account away.

Total cost across the whole sequence was **0.0576089 XLM**, roughly one cent at the observed rate.
Fees on Stellar are 100 stroops per operation, so nearly all of that was the buy-then-sell spread on
a shallow pool rather than network cost.

The lesson is not that it is cheap. It is that the spread, not the fee, is what you pay, and the
spread grows with size on a pool this thin. Reserves are also not a cost: the 0.5 XLM per trustline
and 1 XLM per account come back when you close and merge.

## Common pitfalls

Sending USDT0 to an account with no trustline fails. Add the destination's trustline first.

Amounts are integers in the smallest unit. `--amount 1` sends 0.0000001 USDT0, not 1 USDT0.

Cross-chain transfers normalize to six decimals even though Stellar carries seven, so the eighth
significant digit is floored off as dust and refunded before the debit. Amounts that matter on
Stellar can round when bridged.

Never merge stderr into stdout when parsing a submit. `tx send` writes its info line to stderr and
its JSON to stdout, so `2>&1` breaks the parse, and retrying a submit that actually succeeded spends
real money twice. Confirm with `stellar tx fetch result --hash <HASH> --network mainnet` before any
retry.

**Retry a timed-out submit only after re-reading the sequence number.** A `transaction submission
timeout` means the transaction reached the network and its outcome is unknown. Retrying is usually
safe on this CLI, because it builds transactions with no timebounds and no nonce, so a retry at an
unchanged sequence number is byte-identical, hashes the same, and the network's sequence rules
guarantee at most one copy can be included. That safety disappears the moment the sequence advances:
the next attempt is then a genuinely different transaction and sends the money again. So re-read the
source account's sequence before every retry and stop if it moved:

```bash
curl -s "https://horizon.stellar.org/accounts/<ADDRESS>" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["sequence"])'
```

Never retry on a timer or a fixed retry count.

Check which `mainnet` entry is actually resolving. Running `stellar network add mainnet` twice leaves
two entries, and `stellar network ls --long` prints them in an order that does not tell you which
one wins. Only `--very-verbose` reveals the URL in use. If submissions behave oddly, check this
before blaming the network.

Mainnet runs protocol 27 while testnet runs 28. Do not assume a testnet rehearsal covers everything.

## Related pages

- [Send tokens](send-tokens.md)
- [Build and submit transactions](build-and-submit-transactions.md)
- [Authority model](../reference/authority-model.md)
- [Supported networks](../reference/supported-networks.md)
