import {
  CosmosDatasourceKind,
  CosmosHandlerKind,
  CosmosProject,
} from "@subql/types-cosmos";

// Can expand the Datasource processor types via the genreic param
const project: CosmosProject = {
  specVersion: "1.0.0",
  version: "0.0.1",
  name: "studio-indexer",
  description:
    "This project is used to index all nft interactions on BitSong, it's use SubQuery (subql)",
  runner: {
    node: {
      name: "@subql/node-cosmos",
      version: ">=3.0.0",
    },
    query: {
      name: "@subql/query",
      version: "*",
    },
  },
  schema: {
    file: "./schema.graphql",
  },
  network: {
    /* The unique chainID of the Cosmos Zone */
    chainId: "bitsong-2b",
    /**
     * These endpoint(s) should be public non-pruned archive node
     * We recommend providing more than one endpoint for improved reliability, performance, and uptime
     * Public nodes may be rate limited, which can affect indexing speed
     * When developing your project we suggest getting a private API key
     * If you use a rate limited endpoint, adjust the --batch-size and --workers parameters
     * These settings can be found in your docker-compose.yaml, they will slow indexing but prevent your project being rate limited
     */
    endpoint: ["https://rpc.explorebitsong.com"],
  },
  dataSources: [
    {
      kind: CosmosDatasourceKind.Runtime,
      startBlock: 14963829,
      mapping: {
        file: "./dist/index.js",
        handlers: [
          {
            handler: "handleEvent",
            kind: CosmosHandlerKind.Event,
            filter: {
              type: "instantiate",
              attributes: {
                code_id: "4", // curve store code_id
              },
              messageFilter: {
                type: "/cosmwasm.wasm.v1.MsgExecuteContract",
                contractCall: "create_curve",
                values: {
                  contract: "bitsong1wug8sewp6cedgkmrmvhl3lf3tulagm9hnvy8p0rppz9yjw0g4wtqy04vy2", // factory address
                }
              },
            },
          },
          {
            handler: "handleMintBS721CurveNFT",
            kind: CosmosHandlerKind.Event,
            filter: {
              type: "wasm",
              attributes: {
                action: "mint_bs721_curve_nft",
                creator: "bitsong1wug8sewp6cedgkmrmvhl3lf3tulagm9hnvy8p0rppz9yjw0g4wtqy04vy2", // factory address
              }
            },
          },
          {
            handler: "handleBurnBS721CurveNFT",
            kind: CosmosHandlerKind.Event,
            filter: {
              type: "wasm",
              attributes: {
                action: "burn_bs721_curve_nft",
                creator: "bitsong1wug8sewp6cedgkmrmvhl3lf3tulagm9hnvy8p0rppz9yjw0g4wtqy04vy2", // factory address
              }
            },
          },
          {
            handler: "handleTransferNFT",
            kind: CosmosHandlerKind.Event,
            filter: {
              type: "wasm",
              attributes: {
                action: "transfer_nft"
              }
            },
          },
          {
            handler: "handleSendNFT",
            kind: CosmosHandlerKind.Event,
            filter: {
              type: "wasm",
              attributes: {
                action: "send_nft"
              }
            },
          },
        ],
      },
    },
  ],
};

// Must set default to the project instance
export default project;
