import { getFees } from './mempool';

export async function calculateTxBytesFee(
  vinsLength: number,
  voutsLength: number,
  feeRateTier: string | number,
  includeChangeOutput: 0 | 1 = 1,
) {
  let recommendedFeeRate = await getFees('hourFee');
  if (isNaN(feeRateTier as number)) {
    recommendedFeeRate = await getFees(feeRateTier as string);
  } else {
    recommendedFeeRate = feeRateTier as number;
  }

  return calculateTxBytesFeeWithRate(
    vinsLength,
    voutsLength,
    recommendedFeeRate,
    includeChangeOutput,
  );
}

export function calculateTxBytesFeeWithRate(
  vinsLength: number,
  voutsLength: number,
  feeRate: number,
  includeChangeOutput: 0 | 1 = 1,
): number {
  const baseTxSize = 10;
  const inSize = 180;
  const outSize = 34;

  const txSize =
    baseTxSize +
    vinsLength * inSize +
    voutsLength * outSize +
    includeChangeOutput * outSize;
  const fee = txSize * feeRate;
  return fee;
}

export function getSellerRuneOutputValue(
  price: number,
  makerFeeBp: number,
  prevUtxoValue: number,
): number {
  return (
    price - // listing price
    (makerFeeBp < 1 ? 1 : Math.round(makerFeeBp)) + // less maker fees, seller implicitly pays this
    prevUtxoValue
  ); // seller should get the rest of Rune utxo back
}
