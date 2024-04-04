import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { network } from 'src/common/utils/rpc';
import { IRuneListingState } from './types';
bitcoin.initEccLib(ecc);

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MergeSingers {
  export function mergeSignedBuyingPSBTBase64(
    buyer_state: IRuneListingState,
    seller_items: IRuneListingState[],
  ): string {
    const { signedBuyingPSBTBase64, itemMapping } = buyer_state.buyer!;
    const buyerSignedPsbt = bitcoin.Psbt.fromBase64(signedBuyingPSBTBase64!, {
      network,
    });
    itemMapping!.forEach((item) => {
      const { id, index } = item;

      const signedListingPSBTBase64AndId = seller_items.find(
        (item) => item.seller.runeItem.id === id,
      );

      if (signedListingPSBTBase64AndId) {
        const sellerSignedPsbt = bitcoin.Psbt.fromBase64(
          signedListingPSBTBase64AndId.seller.signedListingPSBTBase64!,
          {
            network,
          },
        );
        (buyerSignedPsbt.data.globalMap.unsignedTx as any).tx.ins[index] = (
          sellerSignedPsbt.data.globalMap.unsignedTx as any
        ).tx.ins[0];
        buyerSignedPsbt.data.inputs[index] = sellerSignedPsbt.data.inputs[0];
      } else {
        throw new Error('Not found signed listing psbt for id: ' + id);
      }
    });

    console.log('buyerSignedPsbt txInputs :>> ', buyerSignedPsbt.txInputs);
    console.log('buyerSignedPsbt txOutputs :>> ', buyerSignedPsbt.txOutputs);
    console.log('buyerSignedPsbt toBase64 :>> ', buyerSignedPsbt.toBase64());

    buyerSignedPsbt.extractTransaction();

    return buyerSignedPsbt.toHex();
  }
}
