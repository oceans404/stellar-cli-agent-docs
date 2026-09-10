---
description: Pay for x402-protected APIs on Stellar with USDC, using the stellar CLI only for the identity and the SEP-41 settlement rail.
keywords: [Stellar, agent, x402, payments, USDC, SEP-41, CLI]
---

# Pay for APIs with x402

x402 is not a `stellar` CLI command. There is no `x402` subcommand, and nothing in the CLI's help
tree mentions HTTP 402. The CLI's role in an x402 payment is limited to two things: an identity to
sign with, and SEP-41 token transfers as the settlement rail underneath the protocol. The x402
handshake itself runs in your agent's own code, through the `@x402/stellar` package.

This guide uses `https://stellar.org/x402-demo/api/protected/testnet`, Stellar's own x402 demo
endpoint on testnet, so you can run the flow end to end before pointing it at the API you actually
care about. It prices access at 0.01 testnet USDC and sponsors the transaction fee. Every step below
was run against it with `@x402/stellar` and `@x402/fetch` at 2.25.0.

**Skill:** `workflows/pay-for-apis-x402.md` in the [Stellar CLI skill package](../skills.md) is the agent-facing version
of this page.

## Ask your agent

```
Pay for https://stellar.org/x402-demo/api/protected/testnet with x402 on Stellar testnet using
USDC, then show me the response.
```

Your agent's x402 client library reads the server's `402` response, builds a Soroban authorization
entry for the requested amount, and retries the request with that payment attached. None of this
goes through the `stellar` binary.

## Steps

1. Give the agent a funded identity. See [Quickstart](../quickstart.md) if you have not already.
   Skip `--secure-store` here: the x402 client needs the raw secret key in step 3, and a
   secure-store identity refuses to reveal it. This is the one flow where the key cannot live in
   the OS keychain.

   ```bash
   stellar keys generate agent-1 --network testnet --fund
   ```

2. Confirm it can actually pay before you attempt a request:

   ```bash
   stellar token balance --id USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --account agent-1 --network testnet
   ```

   The challenge names the asset as a `C…` contract address, not as `CODE:ISSUER`. Both name the
   same asset: `stellar contract id asset --asset USDC:GBBD47IF… --network testnet` resolves to
   `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`, which is what the demo endpoint asks
   for. Compare that way rather than assuming a mismatch.

3. In your agent's code, install the client packages and wrap `fetch` with the Stellar scheme:

   ```bash
   npm install @x402/stellar @x402/fetch
   ```

   ```ts
   import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
   import { createEd25519Signer } from "@x402/stellar";
   import { ExactStellarScheme } from "@x402/stellar/exact/client";

   const signer = createEd25519Signer(process.env.STELLAR_SECRET!, "stellar:testnet");

   const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
     schemes: [{ network: "stellar:*", client: new ExactStellarScheme(signer) }],
   });
   ```

   `npm install` alone will not run that file. Save it as `pay.mjs`, drop the `!` non-null
   assertion, and run `node pay.mjs`, or keep the TypeScript and add a runner such as `tsx`. Pass
   the key in through the environment and never write it into the file:

   ```bash
   STELLAR_SECRET="$(stellar keys secret <IDENTITY>)" node pay.mjs
   ```

   `createEd25519Signer` implements `SignAuthEntry` and `SignTransaction` per SEP-43. The wrapped
   `fetch` makes the request, reads the `402`, builds the payment header, and retries, so you do not
   drive that loop yourself. If you need to control it, `new x402Client().register("stellar:*", new
   ExactStellarScheme(signer))` from `@x402/core/client` is the lower-level equivalent.

4. Make the request. Read the settlement hash off the `payment-response` response header, not the
   body:

   ```ts
   const res = await fetchWithPayment("https://stellar.org/x402-demo/api/protected/testnet");

   const header = res.headers.get("payment-response");
   if (header) console.log(decodePaymentResponseHeader(header));

   console.log(await res.text());
   ```

   ```console
   {
     success: true,
     payer: '<YOUR_ADDRESS>',
     transaction: '137cbcc6e765d0f29bc4cabb2749b9eb1990b71becdd1c626a61cff86d5d1c98',
     network: 'stellar:testnet'
   }
   ```

   Read the body with `res.text()` unless you know the endpoint returns JSON. The demo endpoint
   serves `text/html`, so `res.json()` throws `Unexpected token '<'`.

   Capture the body on the first request. Each call pays again: a paid response is not replayable,
   so re-running the script to see output you truncated costs the amount a second time.

5. Confirm settlement on-chain with the hash from that header. `tx fetch result` takes it as
   `--hash`, not a positional argument:

   ```bash
   stellar tx fetch result --hash <TX_HASH> --network testnet
   ```

   A sponsored payment comes back as a fee bump wrapping the invocation: `fee_charged` on the outer
   fee-bump transaction and `"fee_charged":"0"` on the inner one, with
   `tx_fee_bump_inner_success` and a successful `invoke_host_function`. That zero is the facilitator
   paying the fee, not a free transaction.

   Then re-read the balance from step 2. It should be down by exactly the challenge's `amount`, and
   the native balance unchanged when `areFeesSponsored` is true. That pair is the cleanest proof
   both that you paid what you expected and that the sponsorship held.

## Facilitators

A facilitator is a third party that verifies and settles the payment for the server. Three exist
today, with different maturity:

- **OpenZeppelin's "Built on Stellar" facilitator** is free, public, covers both testnet and
  mainnet, sponsors transaction fees, and settles in roughly five seconds. It is the most
  production-credible option today.
- **Coinbase's hosted facilitator** supports Stellar on testnet only.
- **`OpenZeppelin/relayer-plugin-x402-facilitator`** is self-hostable if you want to run your own
  facilitator on the OpenZeppelin Relayer.

`stellar/x402-stellar` is SDF's own tools and examples repository. It includes a facilitator example
and a simple paywall demo (an Express API with x402 middleware and a React client), and is the place
to start if you are reading real code rather than a package README.

## Asset support

x402 on Stellar works with any SEP-41 token. USDC is the default, and it is the only asset with a
published testnet contract ID in Stellar's own docs. If your API prices in a different asset, you
supply that asset's contract address to the scheme yourself.

## Spending limits

Stellar's own x402 announcement names an "x402-MCP server" that would let an agent "authorize
payments via smart wallets within user-defined spending policies." That is listed as in active
development, not shipped. There is no policy layer for x402 on Stellar today.

The actual bound on an x402 agent's spending is the balance of the account it pays from, or an
allowance you granted with `stellar token approve` if the signer sits behind one. Read
[Authority model](../reference/authority-model.md) before pointing an x402 client at a mainnet key
with a real balance.

## Common pitfalls

Coinbase's facilitator is testnet-only for Stellar. If a payment fails against it on mainnet, that
is why, not a bug in your integration.

Freighter Mobile does not support x402 yet. The Freighter browser extension does. If your agent
drives a mobile wallet for signing, x402 is not available through it today.

A facilitator sits in your payment path as a third party. It verifies and settles on your behalf,
which means it sees the payment before the network does. Choosing a facilitator is a trust decision,
not just a configuration value.

## Related pages

- [Send tokens](send-tokens.md)
- [Delegate spending](delegate-spending.md)
- [Authority model](../reference/authority-model.md)
- [Quickstart](../quickstart.md)
