---
title: Give your AI agent a wallet
sidebar_label: Overview
description: Your agent can read your code and search the web, but it cannot pay for anything. The Stellar CLI is one free tool that lets your agent hold and move real money, with no company in the middle.
keywords: [Stellar, agent, CLI, stellar token, AI agents, skills, Soroban]
---

Your agent can already read your code, search the web, and file your tickets. It cannot pay for
anything. The moment a task involves money, it stops and waits for you.

The Stellar CLI is how you change that. It is one free tool your agent runs on your computer, and it
lets your agent hold and move real money on the Stellar network.

## Why an agent needs its own wallet

Today, if you want an agent to buy an API call, pay a contractor, or move funds between accounts,
you have to do it yourself. You open a browser, click through a wallet extension, approve a popup,
and paste the result back. The agent waits. You are the bottleneck, and you are the part that gets
tired at 2am.

Every existing option asks you to give something up. A hosted wallet means a company holds your keys
and can freeze your funds. A browser extension means somebody has to click. An exchange account
means your money lives somewhere you do not control.

The Stellar CLI asks you to give up nothing. Your keys are files on your own machine, or in your
Mac's Keychain, or on a hardware wallet in your drawer. No company sits between your agent and the
network. No popup. No browser. Your agent types a command, the network settles it in about five
seconds, and the fee is a fraction of a cent.

It is also not a special product built for agents. It is the same tool Stellar's own developers use
every day, which means it does not go away, does not get deprecated in favor of a paid tier, and
does not have a startup's runway attached to it.

## What your agent can do

Ask in plain language. Your agent turns it into commands.

**Check what an account holds.** "How much USDC is in my treasury account?" This one needs no keys
and no setup at all, so it is the safest thing to try first.

One thing to expect if you run it: asking for a specific asset an account does not hold fails rather
than returning zero. It exits 1 and prints `Error(Contract, #13)`, "trustline entry is missing for
account". A trustline is a per-asset opt-in, so an account holds no USDC until it has explicitly
agreed to. XLM, the native asset, needs no trustline, so `--id native` always answers.
[Troubleshooting](troubleshooting.md) has the full diagnosis.

**Send money.** "Send 25 USDC to this address." Settles in seconds, costs about a hundredth of a
cent.

**Identify an unknown token.** "What is this token and how many decimals does it use?" Useful before
you let anything touch it.

**Give your agent a spending limit.** "Let my agent spend up to 50 USDC from the treasury, expiring
tomorrow." The limit is enforced by the network itself, not by the agent's good behavior. If your
agent tries to spend more, the network refuses. This is the feature to care about, and it is one of
the five commands that are merged but not yet released, so it needs a build from `main`. The
[Quickstart](quickstart.md) does that build in step 1.

**Prepare a payment without sending it.** "Draft this payment but do not submit it." You get a file
you can read and approve yourself. Your agent does the work, you keep the final say. You can even
keep the signing key on a separate computer that never goes online.

Underneath, each of those is a command your agent composes and parses.

| Task | Command | Available in |
|---|---|---|
| Read what an account holds | `stellar token balance` | 28.0.0 release |
| Identify an unfamiliar asset | `stellar token name`, `symbol`, `decimals` | **main build only** |
| Move a token | `stellar token transfer` | 28.0.0 release |
| Grant capped, expiring spend authority | `stellar token approve` | **main build only** |
| Audit spend authority already granted | `stellar token allowance` | **main build only** |
| Send any of 22 native operations | `stellar tx new <OPERATION>` | 28.0.0 release |
| Sign a message to prove key control | `stellar message sign` | 28.0.0 release |
| Build a transaction without submitting it | `stellar tx new <OPERATION> --build-only` | 28.0.0 release |
| Deploy and call a contract | `stellar contract deploy`, `stellar contract invoke` | 28.0.0 release |
| Check its own environment | `stellar doctor` | 28.0.0 release |
| Read the CLI's own conventions guide | `stellar skill` | **main build only** |

Five `stellar token` subcommands are merged but not in the 28.0.0 release, so a release install
cannot run them and there is no prebuilt binary that can. Getting them means compiling from source.

`--build-only` is not universal. It belongs to the `tx` family. No `stellar token` command accepts
it, so a payment you want to review before submitting has to be built with `stellar tx new payment
--build-only` rather than `token transfer`.

See [Commands](reference/commands.md) for the full surface.

## Start on testnet

Setup is five commands: install the CLI, verify which build you got, connect it to your agent,
set your defaults, and generate a funded key. Four of them run in seconds. The install is a source build that takes roughly 5 to 15 minutes from cold
and needs Rust 1.93.0 or later, so budget a first sitting of about twenty minutes rather than five.
It all runs on Stellar's test network, where the money is fake and unlimited, so nothing you try can
cost you anything.

**[Start the Quickstart](quickstart.md)** and let your agent do the work.

## Before you use real money

One thing matters more than everything else on this page, so read it even if you skip the rest.

**The tool does not stop your agent from spending.** There is no daily limit, no approval popup, no
list of allowed recipients, and no fraud check. Any account your agent can sign for, it can empty. If
you hand your agent the keys to your savings, that is exactly what you have done.

This is the cost of nobody being in the middle. There is no company to hold your keys, and there is
also no company to catch a mistake.

Three habits make this fine in practice.

**Give your agent its own account with only what you can afford to lose.** Not your main account. A
separate one, funded with the amount you would be annoyed but not hurt to lose. This takes one
command and it caps your worst case.

**Use a spending limit for anything bigger.** Keep your money in an account your agent cannot sign
for, then grant it a capped allowance that expires with `stellar token approve`. Your agent can draw
up to that amount and no more, and the network is what stops it. Ask your agent: "Set up a 50 USDC
allowance from my treasury to agent-1, expiring in a day."

Fair warning on that one: granting the limit is a single command, but spending against it currently
takes a longer one your agent will have to look up. It works, it is just not as smooth as it should
be yet.

**Check the amount before every real transfer.** Amounts are in the token's smallest unit, not the
number you would say out loud. At 7 decimals, 1 XLM is `--amount 10000000`. A wrong multiplier is
not rejected: `--amount 1` submits 0.0000001 XLM, prints a transaction hash, and exits 0, so an
amount that is 10,000,000x too small looks exactly like a success. Read the decimals with
`stellar token decimals --id <TOKEN>` and never assume 7.

Stay on the test network until all three habits feel automatic. It costs nothing and behaves
identically.

One setup detail when you do move: the CLI ships ready for the test network but not for the real one.
Before your first real command, tell it which mainnet server to use, or you will get an
`Invalid URL` error that does not explain itself.

```bash
stellar network add mainnet \
  --rpc-url <YOUR_MAINNET_RPC_URL> \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

Stellar's [RPC providers page](https://developers.stellar.org/docs/data/apis/rpc/providers) lists every endpoint you can use. If you just want one that
works, `https://mainnet.sorobanrpc.com` is public and needs no signup.

[Authority model](reference/authority-model.md) is the honest, complete version of this section, and
[Supported networks](reference/supported-networks.md) covers `mainnet`, `testnet`, `futurenet`, and
`local` in full.

## Where to go next

- [Skills](skills.md) is the skill package that teaches your agent to drive the CLI, one file per
  command family and one per task.
- [Give your agent a spending limit](guides/delegate-spending.md) is the page to read before any
  real money is involved.
- [What bounds your agent](reference/authority-model.md) is explicit about what the CLI does not
  protect you from.
- [Architecture](reference/architecture.md) covers how the read and write paths differ, where state
  lives, and how to split building, signing, and submitting across machines.
- [Output and errors](reference/output-and-errors.md) covers which commands emit structured JSON
  your agent can branch on, because the coverage is not uniform.
- [Troubleshooting](troubleshooting.md) for when something does not work.
