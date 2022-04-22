import type { PeerId } from "@libp2p/interfaces/peer-id";
import type { IncomingStreamData } from "@libp2p/interfaces/registrar";

interface LookupFunction {
  (key: string): Promise<Uint8Array | null>;
}

export interface IFetchService {
  isStarted(): boolean;
  fetch(peer: PeerId, key: string): Promise<Uint8Array | null>;
  handleMessage(data: IncomingStreamData): Promise<void>;
  _getLookupFunction(key: string): LookupFunction | undefined;
  registerLookupFunction(prefix: string, lookup: LookupFunction): void;
  unregisterLookupFunction(prefix: string, lookup?: LookupFunction): void;
}
