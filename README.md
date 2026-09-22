# Stellar CLI for Agents docs (proposed)

A launch-style documentation set for the Stellar CLI as an agent tool, written 2026-09-09 to mirror
the structure and register of MetaMask Agent Wallet's docs at `docs.metamask.io/agent-wallet`.

The name is deliberate. This is not a separate product for agents. It is the same `stellar` binary
humans already run, with agent-experience docs and skills layered on top.

These pages are a proposal, not published Stellar documentation. Nothing here has been reviewed by
SDF docs. The point of writing them in MetaMask's shape was to find out where Stellar has a story to
tell and where it does not, and the answer is in `MASTER-DIFF.md`, which is not published in this
repository.

The agent-facing layer is the CLI's own `stellar skill` subcommand.
[agent-cli/skills.md](agent-cli/skills.md) covers what it includes and what it leaves out.

## What is here

```
docs/
├── agent-cli-sidebar.js              Docusaurus sidebar manifest
├── llms-agent-cli.txt                Page manifest for agent ingestion
├── llms-agent-cli-full.txt           Single-file full-text dump
└── agent-cli/
    ├── index.md                      Overview
    ├── quickstart.md                 Agent-driven onboarding
    ├── guides/
    │   ├── send-tokens.md
    │   ├── check-balances-and-metadata.md
    │   ├── delegate-spending.md
    │   ├── sign-messages.md
    │   ├── build-and-submit-transactions.md
    │   ├── pay-for-apis-x402.md
    │   └── usdt0-on-mainnet.md
    ├── reference/
    │   ├── architecture.md
    │   ├── authority-model.md
    │   ├── output-and-errors.md
    │   └── troubleshooting.md
    └── skills.md                     The built-in stellar skill guide
```

## How it maps to MetaMask's IA

Most pages have a direct counterpart. Three deliberately do not.

`reference/authority-model.md` stands where MetaMask has `reference/trading-modes` and
`reference/outflow-policy`. MetaMask documents a policy engine. We do not have one, so the page
documents what actually bounds an agent (a dedicated identity, an allowance, watch-only keys, a
`--build-only` handoff, and native multisig) and states plainly what the CLI does not protect you
from.

`guides/delegate-spending.md` has no MetaMask counterpart. `stellar token approve` with
`--expiration-ledger` is a capped, expiring, revocable delegated-spend primitive that MetaMask has no
verb for, and it is the strongest thing in this doc set.

`reference/output-and-errors.md` stands where MetaMask has `reference/error-codes`. Theirs documents
stable codes across every command. Ours has to explain that only the `stellar token` family returns
a typed envelope and everything else prints unstructured text to stderr.

Dropped without replacement: MetaMask's swap, bridge, perps, prediction-market, and yield guides,
their plugin section, and their trading-mode reference. The Stellar CLI has no counterpart to any of
them, and inventing pages would have defeated the purpose of the exercise.

## Verification

Every command in these pages was run. Captured output lives in a `research/` directory that is not
published in this repository:

- `verified-token-transcripts.md` covers `stellar token transfer` and `balance` in all three output
  modes, the JSON error envelope, SEP-53 `message sign` and `verify`, and the
  `--build-only | tx sign | tx send` pipeline including offline signing.
- `verified-allowance-transcripts.md` covers `name`, `symbol`, `decimals`, `approve`, and
  `allowance` against the local main build, plus a full grant-read-revoke round trip.

Where a claim could not be verified it was left out rather than guessed at. Release status is called
out per page, because five of the seven `stellar token` subcommands documented here are merged but
not in the 28.0.0 release.

## Known gaps in this set

No guide covers contract development, since that is existing Stellar documentation and not an agent
concern. No page covers Horizon or RPC directly.

## Review status

The set was written by four writers and then reviewed for cross-page contradictions, unsupported
claims, style violations, and broken links. Findings are in `research/docs-review-findings.md`,
also unpublished.

The review caught one substantive error worth naming: three pages and the master diff said
`stellar tx new` covers 24 operations. The real count is 22, confirmed by counting
`stellar tx new --help`. The bad figure came from prose in `research/stellar-cli-inventory.md` whose
own table lists 22 rows, so treat that file's prose counts as unverified.

Two claims the review could not verify were checked afterward and both held: the
`rpc-url is used but network passphrase is missing` error string is verbatim correct, and
`stellar/stellar-cli` does publish a composite GitHub Action at the repo root, which additionally
verifies the downloaded binary against its build attestation.

Two writers disagreed about when `stellar env` secret concealment shipped. Checking
`cmd/soroban-cli/src/commands/env/mod.rs` at each tag settled it: 26.0.0 already had the concealment
machinery but no `--reveal` flag and an inverted check that could still print secrets, and 27.0.0
fixed the check and added the flag. Both pages now say that rather than naming one version.

As of the final pass the set has zero em dashes, no unresolved internal links, and no hedging
phrases.
