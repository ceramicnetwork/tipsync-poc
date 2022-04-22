import { StreamID } from "@ceramicnetwork/streamid";
import { createNode } from "./util/create-node.js";
import { fetchStreamProviders, provideStream } from "./util/provide-stream.js";
import { withFleet } from "./util/with-fleet.js";
import type { IFetchService } from "./util/fetch-service.interface.js";
import { CID } from "multiformats/cid";

const STREAM_ID_A = StreamID.fromString(
  "kjzl6cwe1jw148j1183ue1j9l5fbt3fbfru08e54387qo91t4tusnsecp5db2ws"
);
const STREAM_ID_B = StreamID.fromString(
  "kjzl6cwe1jw147dvq16zluojmraqvwdmbh61dx9e0c59i344lcrsgqfohexp60s"
);

const FETCH_PREFIX = "/tipsync0/";
function fetchKey(key: string): string {
  return `${FETCH_PREFIX}${key}`;
}
function rawFetchKey(key: string): string {
  return key.replace(`${FETCH_PREFIX}`, "");
}

async function main() {
  await withFleet(2, async (instances) => {
    const ipfsA = await instances[0];
    const ipfsB = await instances[1];
    const nodeA = await createNode(ipfsA);
    const nodeB = await createNode(ipfsB);

    console.log("node A:", nodeA.peerId.toString());
    console.log("node B:", nodeB.peerId.toString());

    const fetchA = (nodeA as any).fetchService as IFetchService;
    fetchA.registerLookupFunction(FETCH_PREFIX, async (key: string) => {
      const rawKey = rawFetchKey(key);
      const requestedStreamID = StreamID.fromString(rawKey);
      console.log("nodeA.fetch:request", rawKey);
      if (requestedStreamID.equals(STREAM_ID_A)) {
        return requestedStreamID.cid.bytes;
      }
    });

    const fetchB = (nodeB as any).fetchService as IFetchService;
    fetchB.registerLookupFunction(FETCH_PREFIX, async (key: string) => {
      const rawKey = rawFetchKey(key);
      const requestedStreamID = StreamID.fromString(rawKey);
      console.log("nodeB.fetch:request", rawKey);
      if (requestedStreamID.equals(STREAM_ID_B)) {
        return requestedStreamID.cid.bytes;
      }
    });

    await provideStream(nodeA, ipfsA, STREAM_ID_A);
    await provideStream(nodeB, ipfsB, STREAM_ID_B);

    const providersA = await fetchStreamProviders(ipfsB, STREAM_ID_A); // From ipfs B -> targetting A
    console.log(`=== providers for A: `);
    console.log(providersA);

    const providersB = await fetchStreamProviders(ipfsA, STREAM_ID_B); // From ipfs A -> targetting B
    console.log(`=== providers for B: `);
    console.log(providersB);

    console.log("=== now fetch");

    // Request node B for stream B
    const fromB = await fetchA.fetch(
      nodeB.peerId,
      `/tipsync0/${STREAM_ID_B.toString()}`
    );
    console.log("received from node B:", CID.decode(fromB));
    console.log("expected from node B:", STREAM_ID_B.cid);

    const fromA = await fetchB.fetch(
      nodeA.peerId,
      `/tipsync0/${STREAM_ID_A.toString()}`
    );
    console.log("received from node A:", CID.decode(fromA));
    console.log("expected from node A:", STREAM_ID_A.cid);

    await nodeB.stop();
    await nodeA.stop();
  });
}

main();
