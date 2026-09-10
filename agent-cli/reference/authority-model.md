---
description: What bounds an agent's spending authority when it drives the Stellar CLI, which controls exist today, and which do not.
keywords: [Stellar, agent, authority, spend limit, allowance, policy, multisig, security]
---

# Authority model

The CLI signs what you ask it to sign. It holds keys locally, submits directly to the network, and
applies no judgment in between. There is no service that could refuse a transaction on your behalf.

Read this page before you hand an agent a funded key on mainnet.

**Skill:** `references/authority.md` in the [Stellar CLI skill package](../skills.md) is the agent-facing version
of this page.

## What the CLI does not do

These are absent from the CLI. None of them is planned in it.

- No spend cap. A key that can sign a payment can sign every payment, for the account's full balance.
- No allow-list of destinations, contracts, or networks.
- No rolling limit over any time window.
- No transaction threat scanning. Nothing classifies a destination as known-malicious or warns you
  that a transaction drains an account.
- No second factor. There is no push approval, no email confirmation, and no TOTP anywhere in the
  CLI.
- No loss coverage.
- No agent session. Identities are not scoped to operations, contracts, counterparties, or
  durations.

`stellar fees use` sets a default fee bid. It is not a spend limit.

## What bounds an agent today

Five mechanisms do real work. Combine them rather than picking one.

**A dedicated identity.** Give the agent its own key and fund it with what you are willing to lose.
This is the only control that needs no setup, and it caps your exposure at that account's balance.
It is the right default for testnet and for small mainnet amounts.

```bash
stellar keys generate agent-1 --network testnet --fund --secure-store
```

**An allowance.** Keep funds in an account the agent does not control, and grant the agent a capped,
expiring allowance on a specific token. The network enforces the cap, so the agent cannot exceed it
regardless of what it decides to do.

```bash
stellar token approve --id <TOKEN> --from treasury --spender agent-1 \
  --amount 250000000 --expiration-ledger <LEDGER> --network testnet
```

`stellar token` has no verb for spending an allowance once granted. The spender draws on it through
the contract directly, and the spender's identity signs. `contract invoke --id` is stricter than
`token --id`: it takes only a `C…` contract address or an alias, not `CODE:ISSUER`. Resolve the
contract address first, with a plain read that needs no source account:

```bash
SAC=$(stellar contract id asset --asset <CODE:ISSUER> --network testnet)
stellar contract invoke --id "$SAC" --source agent-1 --network testnet \
  -- transfer_from --spender agent-1 --from treasury --to <DESTINATION> --amount <SMALLEST_UNIT>
```

`--to` needs a trustline for this asset, the same precondition an ordinary transfer has. A missing
one fails with `Error(Contract, #13)`, the same error covered in
[Troubleshooting](../troubleshooting.md).

This is the closest thing the CLI has to a spend limit, and it is genuinely enforced. It also has
hard edges: it caps one spender on one token from one owner, with a ledger deadline and nothing
else, and granting it is a single command while spending against it is not. See
[Delegate spending](../guides/delegate-spending.md).

**Watch-only identities.** An identity added by public key can read and cannot sign.

```bash
stellar keys add treasury --public-key <ADDRESS>
```

**Build-only handoff.** Most mutating commands accept `--build-only`, which stops before signing and
submitting and prints unsigned XDR. It still needs a reachable network, because it reads the source
account's sequence number over RPC. What is genuinely offline is the signing step: `stellar tx sign`
and `stellar tx hash` need no RPC connection at all. Build on a networked machine, hand the XDR to an
offline machine to sign, then submit from a networked machine again. The signing key is what never
touches a networked machine, and that is the real security property.

This does not cover the token family. `token transfer` and `token approve` have no `--build-only`
flag, so this control does not exist for either. Where you need a build-only handoff for moving
value, use `stellar tx new payment --build-only` instead of `token transfer`.

```bash
stellar tx new payment --source treasury --destination <ADDRESS> --amount 10000000 --build-only --network testnet
```

Pass `--network` again at the sign stage. A signature commits to the network passphrase, so signing
without it falls back to your saved default network and can silently produce an envelope that fails
at submission with `TxBadAuth` if that default was the wrong network.

**Native multisig.** Raise an account's thresholds and add the agent's key as a signer whose weight
is below the threshold for the operations you care about. The agent can then propose but not
unilaterally execute.

```bash
stellar tx new set-options --source treasury \
  --signer <AGENT_ADDRESS> --signer-weight 1 --med-threshold 2 --high-threshold 2 \
  --network testnet
```

This is protocol-enforced and mature. It is not a second factor in the authenticator sense, and it
bounds who must agree rather than how much may be spent.

## The one approval gate in the CLI

`--auto-sign` is the only flag that implies an interactive approval step. Its help text scopes it
precisely: it applies only to signatures that require user approval, such as non-root Soroban
authorization entries. By default those entries prompt, and `--auto-sign` suppresses the prompt.

Do not read this as a general confirmation layer. Ordinary payments, trustline changes, and token
transfers never prompt, and passing `--auto-sign` does not change their behavior.

## Hardware and key storage

Keys default to plaintext TOML at `~/.config/stellar/identity/<NAME>.toml`. Two better options
exist for anything holding real value.

`--secure-store` on `stellar keys add` or `stellar keys generate` puts the seed phrase in the OS
keychain, which is Keychain on macOS, the Windows credential store, and kernel keyutils with the
DBus Secret Service on Linux. It supports seed phrases only, not raw secret keys.

`--ledger` on `stellar keys add`, with `--sign-with-ledger` at signing time, keeps the key on a
hardware device. A human presses the button, which makes the device itself the approval gate the CLI
lacks. Check availability with `stellar doctor`.

## On-chain spend bounds

Everything above bounds the agent using the tools in the CLI. The stronger answer is a contract
account that enforces policy at the protocol level, so the rule holds no matter which client signs.

Stellar's primitives for this are real. Soroban custom accounts implement `__check_auth`, which lets
a contract define arbitrary authorization logic including running totals, rolling windows,
allow-lists, and time locks. CAP-71's `delegate_account_auth` makes delegated signer relationships a
native protocol feature rather than a hand-built authorization payload. `stellar token approve`
accepts a `C…` contract address as `--spender`, so a policy contract can be the spender.

The packaging is not there yet, and you should plan around that. Passkey Kit supports policy signers
and is adopted by SDF. OpenZeppelin's `stellar-contracts` accounts package implements context rules,
signers, and pluggable policies, and names AI agents as a target use case, but it is versioned 0.7.x
and its own documentation says rapid iteration is expected. Launchtube, the relayer that removes the
need for the agent to hold XLM for fees, is explicitly disclaimed by SDF as a prototype without
SLAs. SEP-45, which covers contract-account web authentication, is still Draft.

If you need enforced policy on mainnet today, you are assembling those pieces yourself and auditing
the result. There is no supported path that turns "this agent may spend 100 USDC per day to these
three addresses" into a deployed configuration.

## Recommended setup by stage

| Stage | Identity | Funding | Additional controls |
|---|---|---|---|
| Development | Dedicated agent key | Friendbot on testnet | None needed |
| Mainnet trial | Dedicated agent key | Small, replaceable balance | Secure store |
| Mainnet, treasury funds | Watch-only for the treasury, dedicated key for the agent | Allowance from the treasury | Secure store, short allowance expiry, regular `stellar token allowance` audits |
| Mainnet, high value | Agent proposes only | None on the agent key | `--build-only` handoff, multisig thresholds, Ledger signing |

## Related pages

- [Delegate spending](../guides/delegate-spending.md)
- [Build and submit transactions](../guides/build-and-submit-transactions.md)
- [Commands reference](commands.md)
- [Overview](../index.md)
