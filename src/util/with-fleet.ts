import { IPFS } from "ipfs-core-types";
import * as Ctl from "ipfsd-ctl";
import * as ipfsClient from "ipfs-http-client";
import { path } from "go-ipfs";
import { Options } from "ipfs-http-client";
import getPort from "get-port";
import mergeOpts from "merge-options";

const mergeOptions = mergeOpts.bind({ ignoreUndefined: true });

const ipfsHttpModule = {
  create: (ipfsEndpoint: string) => {
    return ipfsClient.create({
      url: ipfsEndpoint,
    });
  },
};

export async function withFleet(
  n: number,
  task: (instances: IPFS[]) => Promise<void>
): Promise<void> {
  return withGoFleet(n, task);
}

const createFactory = () => {
  return Ctl.createFactory(
    {
      ipfsHttpModule,
    },
    {
      go: {
        ipfsBin: path(),
      },
    }
  );
};

async function createIpfsOptions(
  override: Partial<Options> = {},
  repoPath?: string
): Promise<Options> {
  const swarmPort = await getPort();
  const apiPort = await getPort();
  const gatewayPort = await getPort();

  return mergeOptions(
    {
      start: true,
      config: {
        Addresses: {
          Swarm: [`/ip4/127.0.0.1/tcp/${swarmPort}`],
          Gateway: `/ip4/127.0.0.1/tcp/${gatewayPort}`,
          API: `/ip4/127.0.0.1/tcp/${apiPort}`,
        },
        Pubsub: {
          Enabled: true,
        },
        Bootstrap: [],
      },
    },
    repoPath ? { repo: `${repoPath}/ipfs${swarmPort}/` } : {},
    override
  );
}

async function withGoFleet(
  n: number,
  task: (instances: IPFS[]) => Promise<void>,
  overrideConfig: Record<string, unknown> = {}
): Promise<void> {
  const factory = createFactory();

  const controllers = await Promise.all(
    Array.from({ length: n }).map(async () => {
      const ipfsOptions = await createIpfsOptions(overrideConfig);
      return factory.spawn({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore ipfsd-ctl uses own type, that is _very_ similar to Options from ipfs-core
        ipfsOptions,
      });
    })
  );
  const instances = controllers.map((c) => c.api);
  try {
    await task(instances);
  } finally {
    await factory.clean();
  }
}
