## Before running

```pnpm install && pnpm run build```

## Running

`node lib/src/1-providers.js`

A node advertises itself as a provider for a CID. We then find it as the provider for the CID.

`node lib/src/2-multinode.js`

We have two pairs (ipfs + libp2p) of nodes here. Let's call them A and B. We advertise `α` on `A`, and `β` on `B`.
We then try to find a provider for `α` from `B`, and a provider for `β` from `A`.

`node lib/src/3-fetch.js`

The setup here is similar to `2-multinode.js` file. After finding a provider, a node makes a `fetch` request to it,
expecting a response. Node `B` makes a request for `α` to node `A`. Node `A` makes a request for `β` to node `B`.
Expected response is a CID of a requested StreamID.