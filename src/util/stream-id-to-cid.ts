import { StreamID } from "@ceramicnetwork/streamid";
import { sha256 } from "multiformats/hashes/sha2";
import { CID } from "multiformats/cid";

const LIBP2P_KEY_CODE = 0x72;

export async function streamIdToCid(streamId: StreamID): Promise<CID> {
  const streamidDigest = await sha256.digest(streamId.bytes);
  return CID.createV1(LIBP2P_KEY_CODE, streamidDigest);
}
