import { CosmosEvent } from "@subql/types-cosmos";
import fetch from "node-fetch";

export interface NftMetadata {
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
}

export async function getNftMetadata(uri: string): Promise<NftMetadata | undefined> {
  logger.info(`Fetching NFT metadata from ${uri}`);

  try {
    let uriFormatted = uri.replace("ipfs://", "https://yellow-hilarious-jay-665.mypinata.cloud/ipfs/");
    const data = await fetch(uriFormatted);

    return await data.json() as NftMetadata;
  } catch (error) {
    logger.error(`Error fetching NFT metadata from ${uri}: ${error}`);
    return undefined;
  }
}

interface CurveActionsAttributes {
  contractAddress: string;
  referral?: string;
  referralAmount?: string;
  royalties?: string;
  royaltiesRecipient?: string;
  protocolFee?: string;
  tokenIds?: string[];
  price?: string;
  denom?: string;
  sender?: string;
}

export function getCurveActionsAttributes(event: CosmosEvent): CurveActionsAttributes {
  const contractAddress = event.event.attributes[0].value;

  const referral = event.event.attributes.find(
    (attribute) => attribute.key === "referral"
  );

  const referralAmount = event.event.attributes.find(
    (attribute) => attribute.key === "referral_amount"
  );

  const royalties = event.event.attributes.find(
    (attribute) => attribute.key === "royalties"
  );
  const royaltiesRecipient = event.event.attributes.find(
    (attribute) => attribute.key === "royalties_recipient"
  );

  const protocolFee = event.event.attributes.find(
    (attribute) => attribute.key === "protocol_fee"
  );

  const tokenIds = event.event.attributes.find(
    (attribute) => attribute.key === "token_ids"
  )?.value.split(",");

  const price = event.event.attributes.find(
    (attribute) => attribute.key === "price"
  );

  const denom = event.event.attributes.find(
    (attribute) => attribute.key === "denom"
  );

  const recipient = event.event.attributes.find(
    (attribute) => attribute.key === "recipient"
  );

  const burner = event.event.attributes.find(
    (attribute) => attribute.key === "burner"
  );

  return {
    contractAddress,
    referral: referral?.value,
    referralAmount: referralAmount?.value,
    royalties: royalties?.value,
    royaltiesRecipient: royaltiesRecipient?.value,
    protocolFee: protocolFee?.value,
    tokenIds,
    price: price?.value,
    denom: denom?.value,
    sender: recipient?.value || burner?.value,
  }
}