import { createLibp2p, Libp2p } from "libp2p";
import { TCP } from "@libp2p/tcp";
import { WebSockets } from "@libp2p/websockets";
import { WebRTCStar } from "@libp2p/webrtc-star";
import { Mplex } from "@libp2p/mplex";
import { Noise } from "@chainsafe/libp2p-noise";
import { KadDHT } from "@libp2p/kad-dht";
import { asMfMultiaddr } from "./as-mf-multiaddr.js";
import { peerIdFromString } from "@libp2p/peer-id";
import { IPFS } from "ipfs-core-types";

export async function createNode(ipfs: IPFS): Promise<Libp2p> {
  const node = await createLibp2p({
    addresses: {
      listen: ["/ip4/0.0.0.0/tcp/0"],
    },
    transports: [new TCP(), new WebSockets(), new WebRTCStar()],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    dht: new KadDHT({
      clientMode: false,
    }),
  });
  await node.start();

  const ipfsAddresses = await ipfs.swarm.localAddrs();
  const ipfsPeerId = await ipfs.id();

  // Connect to IPFS node
  for (let address of ipfsAddresses) {
    const m = asMfMultiaddr(address).encapsulate(`/ipfs/${ipfsPeerId.id}`);
    await node.peerStore.addressBook.add(peerIdFromString(ipfsPeerId.id), [m]);
    await node.dial(m);
  }

  return node;
}

export async function createNodeA(ipfs: IPFS): Promise<[Libp2p, KadDHT]> {
  const dht = new KadDHT({ clientMode: false });
  const node = await createLibp2p({
    addresses: {
      listen: ["/ip4/0.0.0.0/tcp/0"],
    },
    transports: [new TCP(), new WebSockets(), new WebRTCStar()],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    dht: dht,
  });
  await node.start();

  const ipfsAddresses = await ipfs.swarm.localAddrs();
  const ipfsPeerId = await ipfs.id();

  // Connect to IPFS node
  for (let address of ipfsAddresses) {
    const m = asMfMultiaddr(address).encapsulate(`/ipfs/${ipfsPeerId.id}`);
    await node.peerStore.addressBook.add(peerIdFromString(ipfsPeerId.id), [m]);
    await node.dial(m);
  }

  return [node, dht];
}
