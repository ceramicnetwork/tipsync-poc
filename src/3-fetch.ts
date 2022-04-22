import { StreamID } from "@ceramicnetwork/streamid";
import { createNode } from "./util/create-node.js";
import { fetchStreamProviders, provideStream } from "./util/provide-stream.js";
import { withFleet } from "./util/with-fleet.js";

const STREAM_ID_A = StreamID.fromString(
    "kjzl6cwe1jw148j1183ue1j9l5fbt3fbfru08e54387qo91t4tusnsecp5db2ws"
);
const STREAM_ID_B = StreamID.fromString(
    "kjzl6cwe1jw147dvq16zluojmraqvwdmbh61dx9e0c59i344lcrsgqfohexp60s"
);

async function main() {
    await withFleet(2, async (instances) => {
        const ipfsA = await instances[0];
        const ipfsB = await instances[1];
        const nodeA = await createNode(ipfsA);
        const nodeB = await createNode(ipfsB);

        console.log("node A:", nodeA.peerId.toString());
        console.log("node B:", nodeB.peerId.toString());

        await provideStream(nodeA, ipfsA, STREAM_ID_A);
        await provideStream(nodeB, ipfsB, STREAM_ID_B);

        const providersA = await fetchStreamProviders(ipfsB, STREAM_ID_A); // From ipfs B -> targetting A
        console.log(`=== providers for A: `);
        console.log(providersA);

        const providersB = await fetchStreamProviders(ipfsA, STREAM_ID_B); // From ipfs A -> targetting B
        console.log(`=== providers for B: `);
        console.log(providersB);

        await nodeB.stop();
        await nodeA.stop();
    });
}

main();
