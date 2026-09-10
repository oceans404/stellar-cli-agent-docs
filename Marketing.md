# Give your AI agent a wallet

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

**Send money.** "Send 25 USDC to this address." Settles in seconds, costs about a hundredth of a
cent.

**Identify an unknown token.** "What is this token and how many decimals does it use?" Useful before
you let anything touch it.

**Give your agent a spending limit.** "Let my agent spend up to 50 USDC from the treasury, expiring
tomorrow." The limit is enforced by the network itself, not by the agent's good behavior. If your
agent tries to spend more, the network refuses. This is the feature to care about.

**Prepare a payment without sending it.** "Draft this payment but do not submit it." You get a file
you can read and approve yourself. Your agent does the work, you keep the final say. You can even
keep the signing key on a separate computer that never goes online.

## How to start, in about five minutes

Everything below runs on Stellar's test network, where the money is fake and unlimited. Nothing here
can cost you anything.

**1. Install it.**

```
brew install stellar-cli
```

On Windows, use `winget install --id Stellar.StellarCLI`.

**2. Connect it to your agent.**

If you use Claude Code:

```
claude mcp add --transport http stellar-raven "https://raven.stellar.buzz/mcp"
```

This gives your agent access to Stellar's documentation so it looks things up instead of guessing.
Codex, Cursor, and VS Code have one-line versions too.

**3. Make an account and get free test money.**

```
stellar keys generate agent-1 --network testnet --fund
```

Then ask your agent: "Show me the balance of agent-1 on testnet." If it comes back with a number,
you are done. Your agent has a working wallet.

From there, ask it to send some test money to a friend's address and watch it land.

## Before you use real money

One thing matters more than everything else on this page, so read it even if you skip the rest.

**The tool does not stop your agent from spending.** There is no daily limit, no approval popup, no
list of allowed recipients, and no fraud check. Any account your agent can sign for, it can empty. If
you hand your agent the keys to your savings, that is exactly what you have done.

This is the cost of nobody being in the middle. There is no company to hold your keys, and there is
also no company to catch a mistake.

Two habits make this fine in practice.

**Give your agent its own account with only what you can afford to lose.** Not your main account. A
separate one, funded with the amount you would be annoyed but not hurt to lose. This takes one
command and it caps your worst case.

**Use a spending limit for anything bigger.** Keep your money in an account your agent cannot sign
for, then grant it a capped allowance that expires. Your agent can draw up to that amount and no
more, and the network is what stops it. Ask your agent: "Set up a 50 USDC allowance from my treasury
to agent-1, expiring in a day."

Fair warning on that one: granting the limit is a single command, but spending against it currently
takes a longer one your agent will have to look up. It works, it is just not as smooth as it should
be yet.

Stay on the test network until both habits feel automatic. It costs nothing and behaves identically.

One setup detail when you do move: the CLI ships ready for the test network but not for the real one.
Before your first real command, tell it which mainnet server to use. Ask your agent to run
`stellar network add mainnet` with an RPC URL, or you will get an `Invalid URL` error that does not
explain itself.

## Where to go next

- [Quickstart](agent-cli/quickstart.md) walks through setup with your agent doing the work.
- [Give your agent a spending limit](agent-cli/guides/delegate-spending.md) is the page to read
  before any real money is involved.
- [What bounds your agent](agent-cli/reference/authority-model.md) is the honest, complete version of
  the warning above.
- [Troubleshooting](agent-cli/troubleshooting.md) for when something does not work.
