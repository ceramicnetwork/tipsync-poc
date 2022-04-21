import { createLibp2p } from "libp2p";
import { TCP } from "@libp2p/tcp";
import { Mplex } from "@libp2p/mplex";
import { Noise } from "@chainsafe/libp2p-noise";
import { Gossipsub } from "@achingbrain/libp2p-gossipsub";
import { WebSockets } from "@libp2p/websockets";
import { WebRTCStar } from "@libp2p/webrtc-star";
import { Bootstrap } from "@libp2p/bootstrap";
import { KadDHT } from "@libp2p/kad-dht";
import { create } from "ipfs-http-client";
import { Multiaddr } from "multiaddr";
import { Multiaddr as MFMultiaddr } from "@multiformats/multiaddr";
import { StreamID } from "@ceramicnetwork/streamid";
import { sha256 } from "multiformats/hashes/sha2";
import { CID } from "multiformats/cid";
import type { IPFS } from "ipfs-core-types";
import { peerIdFromCID, peerIdFromString } from "@libp2p/peer-id";
import { PeerId } from "@libp2p/interfaces/peer-id";

export interface PeerData {
  id: PeerId;
  multiaddrs: Multiaddr[];
}

const STREAM_ID = StreamID.fromString(
  "kjzl6cwe1jw148j1183ue1j9l5fbt3fbfru08e54387qo91t4tusnsecp5db2ws"
);
const LIBP2P_KEY_CODE = 0x72;

async function createNode(bootstraps: Multiaddr[]) {
  const bootstrapsList = bootstraps.map((b) => b.toString());
  const node = await createLibp2p({
    addresses: {
      listen: ["/ip4/0.0.0.0/tcp/0"],
    },
    transports: [new TCP(), new WebSockets(), new WebRTCStar()],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    pubsub: new Gossipsub(),
    dht: new KadDHT({
      clientMode: false,
    }),
    peerDiscovery: [new Bootstrap({ list: bootstrapsList })],
  });

  await node.start();
  return node;
}

async function findClosestPeers(ipfs: IPFS, cid: CID) {
  const findingNemo = peerIdFromCID(cid);
  const queryResultsStream = await ipfs.dht.query(findingNemo.toString());
  const peers = new Array<PeerData>();
  for await (const response of queryResultsStream) {
    // if (response.type === EventTypes.PEER_RESPONSE) {
    //   const closer = response.closer.map<PeerData>((peerData) => {
    //     return {
    //       id: peerIdFromString(peerData.id),
    //       multiaddrs: peerData.multiaddrs,
    //     };
    //   });
    //   const providers = response.providers.map<PeerData>((peerData) => {
    //     return {
    //       id: peerIdFromString(peerData.id),
    //       multiaddrs: peerData.multiaddrs,
    //     };
    //   });
    //   peers.push(...closer);
    //   // peers.push(...providers);
    // }
    if (response.type === 2) {
      const providers = {
        id: peerIdFromString(response.peer.id),
        multiaddrs: response.peer.multiaddrs,
      };
      peers.push(providers);
    }
    // if (
    //   peer.type != EventTypes.PEER_RESPONSE &&
    //   peer.type != EventTypes.FINAL_PEER
    // ) {
    //   // todo broken import
    //   // if (peer.type != 2) {
    //   continue;
    // }
    // console.log(JSON.stringify(response, null, 2));
    // peers.push(peerIdFromString(peer));
  }
  console.log("p.2", peers);
  return peers;
}

async function findProviders(ipfs: IPFS, cid: CID): Promise<PeerData[]> {
  console.log(`Looking up providers for CID: ${cid}`);
  const providers = new Array<PeerData>();

  const stream = await ipfs.dht.findProvs(cid);

  for await (const event of stream) {
    if (event.type === 4) {
      event.providers.forEach(provider => {
        providers.push({
          id: peerIdFromString(provider.id),
          multiaddrs: provider.multiaddrs,
        });
      })
    }
  }
  providers.sort();
  return providers;
}

async function main() {
  const streamidDigest = await sha256.digest(STREAM_ID.bytes);
  const streamidAsCid = CID.createV1(LIBP2P_KEY_CODE, streamidDigest); // 206 = StreamID Codec; 0x72 = Libp2p Key Code

  const ipfs = await create({ url: "http://localhost:5001" });
  const clientAddresses = await ipfs.swarm.localAddrs();
  const ipfsPeerId = await ipfs.id();
  const node = await createNode(clientAddresses);

  console.log('node', node.peerId.toString())
  console.log("cid", streamidAsCid);

  // Connect to IPFS node
  for (let add of clientAddresses) {
    const m = new MFMultiaddr(add.bytes).encapsulate(`/ipfs/${ipfsPeerId.id}`);
    await node.peerStore.addressBook.add(peerIdFromString(ipfsPeerId.id), [m]);
    await node.dial(m);
  }

  const peers = await findClosestPeers(ipfs, streamidAsCid);
  let count = 0;
  await Promise.all(
    peers.map(async (p) => {
      const peerId = p.id;
      if (!node.peerId.equals(p.id)) {
        for (let m of p.multiaddrs) {
          await node.peerStore.addressBook.set(
            peerId,
            p.multiaddrs.map((m) => new MFMultiaddr(m.bytes))
          );
        }
        try {
          await node.dial(peerId);
          count = count + 1;
          console.log(`connect ${count}/${peers.length}`);
        } catch (e) {
          console.log(`Fail ${peerId}`, e);
        }
      }
    })
  );
  console.log("===== done peers");

  console.log(`=== provide.2`);
  await node.contentRouting.provide(streamidAsCid);
  console.log(`=== provide done`);

  console.log(`=== next providers`);
  const nextProviders = await findProviders(ipfs, streamidAsCid);
  console.log(`=== next providers: `);
  console.log(nextProviders);
}

main();
