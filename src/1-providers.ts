import { create as createIpfsHttpClient } from "ipfs-http-client";
import { StreamID } from "@ceramicnetwork/streamid";
import { createNode } from "./util/create-node.js";
import { fetchStreamProviders, provideStream } from "./util/provide-stream.js";

const STREAM_ID = StreamID.fromString(
  "kjzl6cwe1jw148j1183ue1j9l5fbt3fbfru08e54387qo91t4tusnsecp5db2ws"
);

async function main() {
  const ipfs = await createIpfsHttpClient({ url: "http://localhost:5001" });
  const nodeA = await createNode(ipfs);

  console.log("node:", nodeA.peerId.toString());

  await provideStream(nodeA, ipfs, STREAM_ID);

  const nextProviders = await fetchStreamProviders(ipfs, STREAM_ID);
  console.log(`=== providers: `);
  console.log(nextProviders);
  await ipfs.stop();
  await nodeA.stop();
}

main();
