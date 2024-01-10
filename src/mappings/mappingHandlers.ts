import {
  CosmosEvent,
  CosmosBlock,
  CosmosMessage,
  CosmosTransaction,
  MsgExecuteContract,
} from "@subql/types-cosmos";
import { Nft, NftActivity, NftToken } from "../types";
import { getCurveActionsAttributes, getNftMetadata } from "../utils";

interface CreateCurveMsg {
  symbol: string;
  name: string;
  uri?: string;
  payment_denom: string;
  payment_address: string;
  max_per_address: number;
  seller_fee_bps: number;
  referral_fee_bps: number;
  start_time: string;
  ratio: number;
}

interface CreateCurve {
  create_curve: CreateCurveMsg;
}

function convertStartTimeToDate(startTime: string): Date {
  return new Date(Number(BigInt(startTime) / BigInt(1000000)));
}

// https://api.bwasmnet-1.bitsong.network/txs/38ED8B2A76898875925F9A3A0EF5E32D65A74487F9770B6E877BFBC6D3F6421C
export async function handleEvent(event: CosmosEvent): Promise<void> {
  logger.info(`Indexing tx ${event.tx.hash} - ${event.block.block.header.height}`)

  const data = event.msg.msg.decodedMsg as MsgExecuteContract<CreateCurve>;
  const marketplaceAddress = event.event.attributes[0].value;
  const contractAddress = event.event.attributes[2].value;

  let metadata;

  if (data.msg.create_curve.uri) {
    metadata = await getNftMetadata(data.msg.create_curve.uri);
  }

  //logger.info(`Data ${JSON.stringify(data)}`)

  const nftRecord = Nft.create({
    id: contractAddress,
    blockHeight: BigInt(event.block.block.header.height),
    txHash: event.tx.hash,
    symbol: data.msg.create_curve.symbol,
    name: data.msg.create_curve.name,
    image: metadata ? metadata.image : undefined,
    animationUrl: metadata ? metadata.animation_url : undefined,
    uri: data.msg.create_curve.uri,
    paymentDenom: data.msg.create_curve.payment_denom,
    paymentAddress: data.msg.create_curve.payment_address,
    maxPerAddress: data.msg.create_curve.max_per_address ? BigInt(data.msg.create_curve.max_per_address) : undefined,
    sellerFeeBps: BigInt(data.msg.create_curve.seller_fee_bps),
    referralFeeBps: BigInt(data.msg.create_curve.referral_fee_bps),
    startTime: convertStartTimeToDate(data.msg.create_curve.start_time),
    saleType: "curve",
    marketplaceAddress,
    ratio: BigInt(data.msg.create_curve.ratio),
    sender: data.sender,
    timestamp: event.block.block.header.time,
  });

  await nftRecord.save();
  logger.info(`Saved NFT ${contractAddress}`);
}

// https://api.bwasmnet-1.bitsong.network/txs/E3153AFBA050D18F9A93834072023EF5B608144A0BB4DC8510D425200182B54D
// https://api.bwasmnet-1.bitsong.network/txs/B90E81C82F9760665A76ABE711A33875EE5EBD1B1DC659326510A1C5D6482249
export async function handleMintBS721CurveNFT(event: CosmosEvent): Promise<void> {
  const { contractAddress, referral, referralAmount, royalties, royaltiesRecipient, protocolFee, tokenIds, price, denom, sender } = getCurveActionsAttributes(event);

  const nft = await Nft.getByFields([
    ["marketplaceAddress", "=", contractAddress],
  ])

  if (nft.length === 0) {
    logger.error(`NFT with marketplaceAddress ${contractAddress} not found`);
    throw new Error(`NFT with marketplaceAddress ${contractAddress} not found`);
  }

  if (!tokenIds) {
    logger.error(`tokenIds is undefined`);
    throw new Error(`tokenIds is undefined`);
  }

  for (const tokenId of tokenIds) {
    const royaltiesPerToken = royalties ? BigInt(royalties) / BigInt(tokenIds.length) : BigInt(0);
    const referralFeePerToken = referralAmount ? BigInt(referralAmount) / BigInt(tokenIds.length) : BigInt(0);
    const protocolFeePerToken = protocolFee ? BigInt(protocolFee) / BigInt(tokenIds.length) : BigInt(0);
    const pricePerToken = price ? BigInt(price) / BigInt(tokenIds.length) : BigInt(0);

    const nftActivityRecord = NftActivity.create({
      id: `${nft[0].id}-${tokenId}-mint`,
      blockHeight: BigInt(event.block.block.header.height),
      txHash: event.tx.hash,
      nftId: nft[0].id,
      tokenId,
      side: "buy",
      referral: referral ? referral : undefined,
      royaltiesRecipient: royaltiesRecipient ? royaltiesRecipient : "",
      paymentDenom: denom ? denom : "",
      royalties: royaltiesPerToken,
      referralFee: referralFeePerToken,
      protocolFee: protocolFeePerToken,
      totalPrice: pricePerToken,
      sender: sender ? sender : "",
      timestamp: event.block.block.header.time,
    });

    await nftActivityRecord.save();
    logger.info(`Saved NFT Activity ${event.tx.hash} - ${tokenId}`);

    let token_uri, metadata;

    try {
      const data = await api.queryContractSmart(nft[0].id, {
        nft_info: {
          token_id: tokenId,
        }
      })

      token_uri = data.token_uri

      if (token_uri) {
        metadata = await getNftMetadata(token_uri);
      }
    } catch (e) {
      logger.warn(`Error getting token_uri for ${nft[0].id} - ${tokenId}`)
    }

    const nftTokenRecord = NftToken.create({
      id: `${nft[0].id}-${tokenId}`,
      blockHeight: BigInt(event.block.block.header.height),
      txHash: event.tx.hash,
      nftId: nft[0].id,
      tokenId,
      image: metadata ? metadata.image : undefined,
      animationUrl: metadata ? metadata.animation_url : undefined,
      uri: token_uri,
      owner: sender ? sender : "",
      timestamp: event.block.block.header.time,
    });

    await nftTokenRecord.save();
    logger.info(`Saved NFT ${nft[0].id} - ${tokenId}`);
  }
}

export async function handleBurnBS721CurveNFT(event: CosmosEvent): Promise<void> {
  const { contractAddress, referral, referralAmount, royalties, royaltiesRecipient, protocolFee, tokenIds, price, denom, sender } = getCurveActionsAttributes(event);

  const nft = await Nft.getByFields([
    ["marketplaceAddress", "=", contractAddress],
  ])

  if (nft.length === 0) {
    logger.error(`NFT with marketplaceAddress ${contractAddress} not found`);
    throw new Error(`NFT with marketplaceAddress ${contractAddress} not found`);
  }

  if (!tokenIds) {
    logger.error(`tokenIds is undefined`);
    throw new Error(`tokenIds is undefined`);
  }

  for (const tokenId of tokenIds) {
    const royaltiesPerToken = royalties ? BigInt(royalties) / BigInt(tokenIds.length) : BigInt(0);
    const referralFeePerToken = referralAmount ? BigInt(referralAmount) / BigInt(tokenIds.length) : BigInt(0);
    const protocolFeePerToken = protocolFee ? BigInt(protocolFee) / BigInt(tokenIds.length) : BigInt(0);
    const pricePerToken = price ? BigInt(price) / BigInt(tokenIds.length) : BigInt(0);

    const nftActivityRecord = NftActivity.create({
      id: `${nft[0].id}-${tokenId}-burn`,
      blockHeight: BigInt(event.block.block.header.height),
      txHash: event.tx.hash,
      nftId: nft[0].id,
      tokenId,
      side: "sell",
      referral: referral ? referral : undefined,
      royaltiesRecipient: royaltiesRecipient ? royaltiesRecipient : "",
      paymentDenom: denom ? denom : "",
      royalties: royaltiesPerToken,
      referralFee: referralFeePerToken,
      protocolFee: protocolFeePerToken,
      totalPrice: pricePerToken,
      sender: sender ? sender : "",
      timestamp: event.block.block.header.time,
    });
    await nftActivityRecord.save();
    logger.info(`Saved NFT Activity ${event.tx.hash}`);

    await NftToken.remove(`${nft[0].id}-${tokenId}`);
    logger.info(`Removed NFT ${nft[0].id} - ${tokenId}`);
  }
}

export async function handleTransferNFT(event: CosmosEvent): Promise<void> {
  const contractAddress = event.event.attributes[0].value;

  const sender = event.event.attributes.find(
    (attribute) => attribute.key === "sender"
  );

  const recipient = event.event.attributes.find(
    (attribute) => attribute.key === "recipient"
  );

  const token_id = event.event.attributes.find(
    (attribute) => attribute.key === "token_id"
  );

  if (!sender || !recipient || !token_id) {
    logger.error(`sender or recipient or token_id is undefined`);
    throw new Error(`sender or recipient or token_id is undefined`);
  }

  const nfts = await NftToken.getByFields([
    ["nftId", "=", contractAddress],
    ["tokenId", "=", token_id.value],
  ])

  if (nfts.length === 0) {
    logger.error(`NFT not found`);
    throw new Error(`NFT not found`);
  }

  const nft = nfts[0];

  nft.owner = recipient.value;

  await nft.save();
  logger.info(`New owner for NFT ${nft.id} - ${nft.tokenId} is ${nft.owner}`);
}

export async function handleSendNFT(event: CosmosEvent): Promise<void> {
  const contractAddress = event.event.attributes[0].value;

  const sender = event.event.attributes.find(
    (attribute) => attribute.key === "sender"
  );

  const contract = event.event.attributes.find(
    (attribute) => attribute.key === "contract"
  );

  const token_id = event.event.attributes.find(
    (attribute) => attribute.key === "token_id"
  );

  if (!sender || !contract || !token_id) {
    logger.error(`sender or contract or token_id is undefined`);
    throw new Error(`sender or contract or token_id is undefined`);
  }

  const nfts = await NftToken.getByFields([
    ["nftId", "=", contractAddress],
    ["tokenId", "=", token_id.value],
  ])

  if (nfts.length === 0) {
    logger.error(`NFT not found`);
    throw new Error(`NFT not found`);
  }

  const nft = nfts[0];

  nft.owner = contract.value;

  await nft.save();
  logger.info(`New owner for NFT ${nft.id} - ${nft.tokenId} is ${nft.owner}`);
}