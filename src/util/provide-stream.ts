import type { StreamID } from "@ceramicnetwork/streamid";
import { streamIdToCid } from "./stream-id-to-cid.js";
import type { Libp2p } from "libp2p";
import type { IPFS } from "ipfs-core-types";
import { asMfMultiaddr } from "./as-mf-multiaddr.js";
import { EventTypes } from "./query-event.js";
import { peerIdFromString } from "@libp2p/peer-id";
import type { CID } from "multiformats/cid";
import type { Multiaddr } from "multiaddr";
import type { PeerId } from "@libp2p/interfaces/peer-id";
import all from "it-all";

export interface PeerData {
  id: PeerId;
  multiaddrs: Multiaddr[];
}

export async function connectPeers(
  node: Libp2p,
  peersStream: AsyncIterable<PeerData>
) {
  for await (let peer of peersStream) {
    try {
      await node.peerStore.addressBook.set(
        peer.id,
        peer.multiaddrs.map(asMfMultiaddr)
      );
      await node.dial(peer.id);
    } catch (e) {
      // Ignore
    }
  }
}

export async function* closestPeers(ipfs: IPFS, cid: CID): AsyncIterable<PeerData> {
  for await (let event of ipfs.dht.query(cid)) {
    if (event.type === EventTypes.FINAL_PEER) {
      yield {
        id: peerIdFromString(event.peer.id),
        multiaddrs: event.peer.multiaddrs,
      };
    }
  }
}

export async function provideStream(
  node: Libp2p,
  ipfs: IPFS,
  streamId: StreamID
) {
  const streamidAsCid = await streamIdToCid(streamId);
  console.log("---- provideStream: 0");
  await connectPeers(node, closestPeers(ipfs, streamidAsCid));
  console.log("---- provideStream: 1: connected peers");
  await node.contentRouting.provide(streamidAsCid);
  console.log(`---- provideStream: 2: provided ${streamId}`);
}

export function fetchStreamProviders(
  ipfs: IPFS,
  streamId: StreamID
): Promise<PeerData[]> {
  return all(streamProviders(ipfs, streamId));
}

async function* streamProviders(
  ipfs: IPFS,
  streamId: StreamID
): AsyncIterable<PeerData> {
  const cid = await streamIdToCid(streamId);
  for await (let event of ipfs.dht.findProvs(cid)) {
    if (event.type === EventTypes.PROVIDER) {
      for (let provider of event.providers) {
        yield {
          id: peerIdFromString(provider.id),
          multiaddrs: provider.multiaddrs,
        };
      }
    }
  }
}
