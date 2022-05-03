import { create as createIpfsHttpClient } from "ipfs-http-client";
import { StreamID } from "@ceramicnetwork/streamid";
import { createNodeA } from "./util/create-node.js";
import {
  closestPeerIds,
  closestPeers,
  connectPeers,
  fetchStreamProviders,
  PeerData,
  provideStream,
} from "./util/provide-stream.js";
import { streamIdToCid } from "./util/stream-id-to-cid.js";
import all from "it-all";
import { Libp2p } from "libp2p";
import { CID } from "multiformats/cid";
import { KadDHT } from "@libp2p/kad-dht";
// import { Message, MESSAGE_TYPE } from "./kad-dht-copy/message/index.js";
import { pipe } from "it-pipe";
import * as lp from "it-length-prefixed";
import drain from "it-drain";
import { Message, MESSAGE_TYPE } from "./libp2p-kad-dht/message/index.js";

const STREAM_ID = StreamID.fromString(
  "kjzl6cwe1jw148j1183ue1j9l5fbt3fbfru08e54387qo91t4tusnsecp5db2ws"
);

async function provideManual(
  node: Libp2p,
  dht: KadDHT,
  peers: Array<PeerData>,
  cid: CID
) {
  const peerId = node.peerId;
  const multiaddrs = node.getMultiaddrs();
  await dht.lan.providers.addProvider(cid, peerId);
  await dht.wan.providers.addProvider(cid, peerId);
  const msg = new Message(MESSAGE_TYPE.ADD_PROVIDER, cid.bytes, 0);
  msg.providerPeers = [
    {
      id: peerId,
      multiaddrs: multiaddrs,
      protocols: [],
    },
  ];

  let lanCounter = 0
  for await (let peer of peers) {
    try {
      console.log('m.0', dht.lan.protocol, peer.id)
      console.log('m.1', await node.peerStore.addressBook.get(peer.id))
      const { stream } = await node.dialProtocol(peer.id, dht.lan.protocol);
      await pipe([msg.serialize()], lp.encode(), stream, drain);
      lanCounter = lanCounter + 1
    } catch (e) {
      console.warn(e.message);
    }
  }
  console.log(`lan ${lanCounter}/${peers.length}`)

  // let wanCounter = 0
  // for await (let peer of peers) {
  //   try {
  //     const { stream } = await node.dialProtocol(peer.id, dht.wan.protocol);
  //     await pipe([msg.serialize()], lp.encode(), stream, drain);
  //     wanCounter = wanCounter + 1
  //   } catch (e) {
  //     console.warn(e);
  //   }
  // }
  // console.log(`wan ${lanCounter}/${peers.length}`)
}

async function main() {
  const ipfs = await createIpfsHttpClient({ url: "http://localhost:5001" });
  const [nodeA, dht] = await createNodeA(ipfs);

  console.log("node:", nodeA.peerId.toString());

  const streamidAsCid = await streamIdToCid(STREAM_ID);
  console.log("---- provideStream: 0");
  const peerIds = await all(closestPeerIds(ipfs, streamidAsCid));
  console.log("---- provideStream: 1: got peers");
  console.log('peers.0', peerIds)
  await connectPeers(nodeA, peerIds);
  console.log("---- provideStream: 2: connected peers");
  // await nodeA.contentRouting.provide(streamidAsCid);
  // await provideManual(nodeA, dht, peers, streamidAsCid);
  console.log(`---- provideStream: 3: provided ${STREAM_ID}`);

  // const nextProviders = await fetchStreamProviders(ipfs, STREAM_ID);
  // console.log(`=== providers: `);
  // console.log(nextProviders);
  // await ipfs.stop();
  await nodeA.stop();
}

main();
