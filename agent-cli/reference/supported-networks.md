---
description: The four built-in Stellar networks, their passphrases, funding methods, and how to list, switch, and diagnose them.
keywords: [Stellar, CLI, networks, testnet, mainnet, futurenet, local, friendbot]
---

# Supported networks

A fresh install of `stellar` ships four networks configured by default: `mainnet`, `testnet`,
`futurenet`, and `local`. Every value below came from `stellar network ls --long` and `stellar
doctor` run against this install.

**Skill:** `references/networks.md` in the [Stellar CLI skill package](../skills.md) is the agent-facing version
of this page.

## The four built-in networks

| Network | Passphrase | Funding | Intended use |
|---|---|---|---|
| `mainnet` | `Public Global Stellar Network ; September 2015` | No friendbot. Fund from an exchange, an on-ramp, or an existing funded account. | Real value. Move here only after testing on `testnet`. |
| `testnet` | `Test SDF Network ; September 2015` | `stellar keys fund <NAME> --network testnet` | Default development network. Free funding, protocol version matches `mainnet` closely. |
| `futurenet` | `Test SDF Future Network ; October 2022` | `stellar keys fund <NAME> --network futurenet` | Preview network. Runs protocol features ahead of `mainnet` and `testnet`, so it can be less stable. |
| `local` | `Standalone Network ; February 2017` | Friendbot runs inside the container once started. | A network you fully control on your own machine. Needs no external RPC or connectivity. |

RPC URLs for the built-in networks:

| Network | RPC URL |
|---|---|
| `mainnet` | No default. Ships as a placeholder, `Bring Your Own: <a docs link>`, not a real endpoint. |
| `testnet` | `https://soroban-testnet.stellar.org/` |
| `futurenet` | `https://rpc-futurenet.stellar.org/` |
| `local` | `http://localhost:8000/rpc` |

**Mainnet ships with no working RPC URL.** A fresh install's built-in `mainnet` entry is a
placeholder pointing at a docs page, not an endpoint. Any command against `mainnet` before you add
a real RPC fails:

```console
$ stellar network ls --long
Name: mainnet
RPC url: Bring Your Own: https://developers.stellar.org/docs/data/rpc/rpc-providers

$ stellar token balance --id native --account <ADDRESS> --network mainnet
❌ error: Invalid URL Bring Your Own: https://developers.stellar.org/docs/data/rpc/rpc-providers
```

Add a real endpoint before running anything against mainnet:

```bash
stellar network add mainnet --rpc-url <YOUR_MAINNET_RPC_URL> \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

Stellar's [RPC providers page](https://developers.stellar.org/docs/data/apis/rpc/providers) lists the public and commercial endpoints to choose from.
The public `https://mainnet.sorobanrpc.com` needs no signup and can be pasted in directly:

```bash
stellar network add mainnet --rpc-url https://mainnet.sorobanrpc.com \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

Validate any endpoint with one cheap Soroban write before you rely on it. `network health` tells you
the endpoint answers, not that it will complete a contract invocation. See
[USDT0 on mainnet](../guides/usdt0-on-mainnet.md) for a measured case where reads and classic
submissions worked and Soroban submissions timed out.

`testnet`, `futurenet`, and `local` all ship with a working default and need no such step. Add
another RPC endpoint for any network, mainnet included, with `stellar network add <NAME> --rpc-url
<URL> --network-passphrase <PASSPHRASE>`, under a different name if you want to keep more than one
side by side.

## List, switch, and add networks

List every configured network:

```bash
stellar network ls
```

Add `--long` for the RPC URL, headers, and passphrase of each:

```bash
stellar network ls --long
```

Set a default so `--network` can be omitted from later commands:

```bash
stellar network use testnet
```

Clear the default:

```bash
stellar network unset
```

Add a network the CLI does not ship, or a second endpoint for one it does:

```bash
stellar network add mainnet-alt --rpc-url <RPC_URL> --network-passphrase "Public Global Stellar Network ; September 2015"
```

`--rpc-url` and `--network-passphrase` are both required on `network add`. `--rpc-header` is
optional and repeatable, for an RPC provider that needs an API key header.

See [`stellar network`](commands.md#stellar-network) in the commands reference for every flag.

## What `stellar doctor` reports

`stellar doctor` checks every configured network's reachability, and its protocol and RPC version
if reachable:

```console
⚠️  Default network "local" (http://localhost:8000/rpc) is unreachable
🌎 Default network "futurenet" (https://rpc-futurenet.stellar.org/)
    protocol 28
    rpc 28.0.0-e29c911f2a720e2bf05028014c00492450547ccc
🌎 Default network "testnet" (https://soroban-testnet.stellar.org/)
    protocol 28
    rpc 28.0.1-273f19e4fcb183b568948bd2b810abfe87150a9c
🌎 Network "mainnet-alt" (https://mainnet.sorobanrpc.com/)
    protocol 27
    rpc 27.1.1-7e712815319140618b9be8cf0846701a6f9a2cbe
```

The four built-in networks print as `Default network "<name>" (...)`. Any network you added
yourself prints as `Network "<name>" (...)`, with no `Default` label, even if you have not run
`network use` on any network. `local` prints a warning glyph and "is unreachable" instead of a
protocol and RPC line when no container is running.

Run `stellar doctor` before debugging a network problem further. It answers "is the RPC endpoint
even reachable" before you spend time on anything else.

## Resolution order for network settings

Three ways to name RPC settings for a command, in order of precedence:

1. Explicit flags: `--rpc-url`, `--rpc-header`, `--network-passphrase`.
2. `--network <NAME>` (or the `STELLAR_NETWORK` environment variable), which resolves to a
   network saved with `network add`.
3. The default network set by `stellar network use`.
4. `testnet`, if none of the above is set at all.

That fourth level is real and undocumented by the CLI itself. On a config directory with nothing
configured, no `network use`, no `STELLAR_NETWORK`, no flags, a command still resolves to
`testnet`: `stellar ledger latest --output json` on a fresh config directory returns the same
ledger ID and sequence as `stellar ledger latest --network testnet --output json`. `stellar env` on
that same fresh config prints `⚠️  No defaults or environment variables set`, which is true and also
silent about this fallback; it does not tell you testnet is what you are actually talking to.

Omitting `--network` therefore does not fail. It silently succeeds against testnet. Treat that as an
accident of the current default, not a guarantee: the moment anyone runs `stellar network use
mainnet` on that machine, the exact same omitted `--network` resolves to mainnet instead, with real
funds. Pass `--network` explicitly on every command regardless of what the implicit fallback happens
to be today.

Passing `--rpc-url` does not fall back to a named network's saved passphrase, even when
`--network` is also given. The two are resolved independently, and the CLI errors if a passphrase
is missing:

```console
$ stellar network health --network testnet --rpc-url http://127.0.0.1:1/rpc
❌ error: rpc-url is used but network passphrase is missing, use `--network-passphrase` or `STELLAR_NETWORK_PASSPHRASE`
```

Pass `--network-passphrase` (or set `STELLAR_NETWORK_PASSPHRASE`) alongside any explicit
`--rpc-url` to avoid this, whether or not `--network` is also present.

## `local` needs a running container

`local` has no external RPC endpoint. It is your own machine, and nothing answers at
`http://localhost:8000/rpc` until you start one:

```bash
stellar container start local
```

This runs a Stellar node, RPC, Horizon-compatible API, and friendbot inside a container, by
default the equivalent of:

```bash
docker run --rm -p 8000:8000 --name stellar stellar/quickstart:latest --testnet --enable rpc,horizon
```

`stellar container start` also accepts `testnet`, `futurenet`, and `pubnet` as a network argument,
which runs a local container tracking that network's ledger instead of a fresh standalone chain.
Stop it with `stellar container stop`, and read its logs with `stellar container logs`. See
[`stellar container`](commands.md#stellar-container) in the commands reference.

Requirements: Docker (or, on macOS 26 and later on Apple silicon, Apple's `container` CLI, set
with `--engine apple-container`). `stellar doctor` reports whether a container engine is available
on your machine.

## Related pages

- [Commands reference](commands.md)
- [Authority model](authority-model.md)
- [Quickstart](../quickstart.md)
