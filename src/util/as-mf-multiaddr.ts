import { Multiaddr } from "multiaddr";
import { Multiaddr as MFMultiaddr } from "@multiformats/multiaddr";

export function asMfMultiaddr(m: Multiaddr): MFMultiaddr {
  return new MFMultiaddr(m.bytes);
}
