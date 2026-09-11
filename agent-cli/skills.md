---
title: Skills
sidebar_label: Skills
description: 'The Stellar CLI skill package: what each file covers, how to install it, and how it differs from these docs.'
keywords: [Stellar, agent, skills, SKILL.md, Claude Code, agent experience]
---

These docs explain the CLI. The skill package tells an agent how to drive it.

The package lives in its own repository,
[oceans404/stellar-cli-skills](https://github.com/oceans404/stellar-cli-skills), under
`stellar-cli/`. It is a directory of markdown files an agent loads on demand: one entry point, nine
references, and nine workflows. Clone it and copy the directory into your agent's skills location
(for Claude Code, that is `~/.claude/skills/stellar-cli/` for every project, or
`.claude/skills/stellar-cli/` for one).

```bash
git clone https://github.com/oceans404/stellar-cli-skills.git
cp -r stellar-cli-skills/stellar-cli ~/.claude/skills/stellar-cli
```

The skill assumes a build from `main`, which is what [Quickstart](quickstart.md) installs. Its
frontmatter records that as `cliVersion: "main"`.

## Entry point

[`SKILL.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/SKILL.md) carries the routing table, the once-per-session preflight, and the
behavioral rules. It is the only file an agent needs to read first. It tells the agent to probe
`stellar token decimals --help` rather than trust `--version`, because a main build and a release
build report the same number.

## References

Each reference covers one command family: what the flags do, what the output looks like, and which
errors mean what.

| File | Covers | Docs counterpart |
|---|---|---|
| [`references/token.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/references/token.md) | `transfer`, `balance`, `name`, `symbol`, `decimals`, and the four forms `--id` accepts | [Check balances and metadata](guides/check-balances-and-metadata.md) |
| [`references/allowances.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/references/allowances.md) | `approve`, `allowance`, and the `transfer_from` spend path | [Delegate spending](guides/delegate-spending.md) |
| [`references/transactions.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/references/transactions.md) | `tx new` operations, `--build-only`, `sign`, `send`, simulate | [Build and submit transactions](guides/build-and-submit-transactions.md) |
| [`references/keys.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/references/keys.md) | Identity lifecycle, secure store, Ledger, watch-only | [Quickstart](quickstart.md) |
| [`references/networks.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/references/networks.md) | Network selection, `STELLAR_*` precedence, passphrases, mainnet RPC | [Supported networks](reference/supported-networks.md) |
| [`references/authority.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/references/authority.md) | What bounds an agent, and what does not | [Authority model](reference/authority-model.md) |
| [`references/errors.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/references/errors.md) | The typed error envelope, exit codes, retrying safely | [Output and errors](reference/output-and-errors.md) |
| [`references/signing.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/references/signing.md) | SEP-53 message signing and verification | [Sign messages](guides/sign-messages.md) |
| [`references/contracts.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/references/contracts.md) | Contract deploy, invoke, and the generated per-contract CLI | [Commands](reference/commands.md) |

## Workflows

Each workflow is an ordered checklist with preconditions, a success condition per step, the cases
that should stop and ask the user, and a symptom-to-cause failure table.

| File | Task | Docs counterpart |
|---|---|---|
| [`workflows/onboarding.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/workflows/onboarding.md) | Install from `main`, produce a funded testnet identity | [Quickstart](quickstart.md) |
| [`workflows/send-tokens.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/workflows/send-tokens.md) | Send a token, including the trustline case | [Send tokens](guides/send-tokens.md) |
| [`workflows/delegate-spending.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/workflows/delegate-spending.md) | Grant a capped, expiring allowance | [Delegate spending](guides/delegate-spending.md) |
| [`workflows/audit-and-revoke-allowances.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/workflows/audit-and-revoke-allowances.md) | Check and revoke what is already granted | [Delegate spending](guides/delegate-spending.md) |
| [`workflows/pay-for-apis-x402.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/workflows/pay-for-apis-x402.md) | Pay an x402-protected endpoint and confirm settlement | [Pay for APIs with x402](guides/pay-for-apis-x402.md) |
| [`workflows/self-expiring-grant.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/workflows/self-expiring-grant.md) | Park funds an agent may claim until a deadline, and reclaim them | [Delegate spending](guides/delegate-spending.md) |
| [`workflows/zero-xlm-agent.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/workflows/zero-xlm-agent.md) | Sponsor an agent that holds no XLM and pay its fees per transaction | [Delegate spending](guides/delegate-spending.md) |
| [`workflows/acquire-an-asset.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/workflows/acquire-an-asset.md) | Add a trustline and take delivery of an asset | [USDT0 on mainnet](guides/usdt0-on-mainnet.md) |
| [`workflows/air-gapped-signing.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/workflows/air-gapped-signing.md) | Split build, sign, and submit across machines | [Build and submit transactions](guides/build-and-submit-transactions.md) |
| [`workflows/troubleshooting.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/workflows/troubleshooting.md) | Diagnose a failure from the symptom | [Troubleshooting](troubleshooting.md) |
| [`workflows/teardown.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/workflows/teardown.md) | Retire an identity and its keys | [Quickstart](quickstart.md) |

## Why both exist

A page here explains a mechanism so a person can reason about it. A skill file constrains an agent
so it does not improvise. They carry the same facts and use them differently: this page tells you
that `token transfer` returns an empty stdout on a submission timeout even though the transaction
reached the network, and [`references/errors.md`](https://github.com/oceans404/stellar-cli-skills/blob/main/stellar-cli/references/errors.md) tells an agent not to retry until it
has confirmed on-chain state.

Where the two disagree, the docs are the source and the skill is stale. Report it.
