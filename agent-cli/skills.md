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
references, and eleven workflows. Clone it and copy the directory into your agent's skills location
(for Claude Code, that is `~/.claude/skills/stellar-cli/` for every project, or
`.claude/skills/stellar-cli/` for one).

```bash
git clone https://github.com/oceans404/stellar-cli-skills.git
cp -r stellar-cli-skills/stellar-cli ~/.claude/skills/stellar-cli
```

The skill assumes a build from `main`, which is what [Quickstart](quickstart.md) installs. Its
frontmatter records that as `cliVersion: "main"`.

## The CLI now ships its own skill guide

A build from `main` has a `stellar skill` subcommand that prints a 128-line Markdown guide for AI
agents. It is not in the 28.0.0 release, where it exits `2` with `error: unrecognized subcommand
'skill'`.

```bash
stellar skill > stellar-cli-skill.md
```

It is a static document compiled into the binary (`cmd/soroban-cli/src/commands/skill/SKILL.md`
upstream), not generated from the command tree, so it does not track flag changes automatically and
it says nothing about your local config.

The two layers do different jobs and do not overlap much. `stellar skill` is a conventions guide for
a contract developer's agent: prefer `network use` and `keys use` over repeating flags, keep contract
IDs in aliases rather than shell variables, use `--send=no` for reads, remember that storage entries
have a TTL. It covers `network`, `keys`, `contract`, `container`, and `env`, and nothing else.

Measured against a `main` build, `stellar skill` contains zero mentions of
`stellar token`, `tx new`, SEP-53 message signing, `--build-only`, `approve`, `allowance`, or
mainnet. Every one of those is something an agent handling money has to get right, and all of them
are in this package. The two are complementary, not redundant: read `stellar skill` for how the CLI
wants to be driven, and this package for what happens when an agent spends.

Where they disagree, `stellar skill` ships with the binary and wins on the binary's own conventions.
On `--id`, for example, it tells agents to prefer `--id` over `--contract-id` even though `main`
renamed the canonical flag, because `--id` is the spelling that works on both builds. This package
follows it. See [`--id` versus `--contract-id`](reference/commands.md#--id-versus---contract-id).

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

Where the two disagree, neither layer is authoritative. Resolve the conflict by running the
command against a live network, then write the measured result into both layers. Of four
doc-versus-skill conflicts resolved at a terminal during testing, the skill matched the binary in
three. That is a direction on a sample of four, not a rate, and it is enough to retire any rule that
picks a winner by layer.

For errors specifically the two layers are not independent, so treat agreement between them as weak
evidence. [Output and errors](reference/output-and-errors.md) states that `references/errors.md` is
"the agent-facing version of this page", which is why the error claims that were wrong were wrong in
identical words on both sides.
