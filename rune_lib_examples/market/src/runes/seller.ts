import { network } from '../utils/rpc';
import { IRuneItem, IRunePostPSBTListing, InvalidArgumentError, IRuneListingState } from './types';
import * as bitcoin from 'bitcoinjs-lib';
import { generateTxidFromHash, toXOnly } from '../utils/util';
import { getSellerRuneOutputValue } from '../vendors/feeprovider';
import { FullnodeRPC } from '../vendors/fullnoderpc';

export namespace SellerHandler {
  export async function generateUnsignedPsbt(listing: IRuneListingState): Promise<IRuneListingState> {
    // NOTE:
    // Before calling this method,
    // We should verify that the seller rune utxo is still unspent and valid

    const psbt = new bitcoin.Psbt({ network });
    const runeUtxoTxId = listing.seller.runeItem.txid;
    const runeUtxoVout = listing.seller.runeItem.vout;

    const tx = bitcoin.Transaction.fromHex(await FullnodeRPC.getrawtransaction(runeUtxoTxId));

    // No need to add this witness if the seller is using taproot
    if (!listing.seller.tapInternalKey && !listing.seller.publicKey) {
      for (const output in tx.outs) {
        try {
          tx.setWitness(parseInt(output), []);
        } catch {}
      }
    }

    const input: any = {
      hash: runeUtxoTxId,
      index: runeUtxoVout,
      nonWitnessUtxo: tx.toBuffer(),
      // No problem in always adding a witnessUtxo here
      witnessUtxo: tx.outs[runeUtxoVout],
      sighashType: bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    };
    // If taproot is used, we need to add the internal key
    if (listing.seller.tapInternalKey && !listing.seller.publicKey) {
      input.tapInternalKey = toXOnly(tx.toBuffer().constructor(listing.seller.tapInternalKey, 'hex'));
    } else if (!listing.seller.tapInternalKey && listing.seller.publicKey) {
      input.tapInternalKey = toXOnly(tx.toBuffer().constructor(toXOnly(Buffer.from(listing.seller.publicKey, 'hex')), 'hex'));
    }

    psbt.addInput(input);

    const sellerOutput = getSellerRuneOutputValue(listing.seller.price, listing.seller.makerFeeBp, listing.seller.runeItem.outputValue);

    psbt.addOutput({
      address: listing.seller.sellerReceiveAddress,
      value: sellerOutput,
    });

    listing.seller.unsignedListingPSBTBase64 = psbt.toBase64();
    return listing;
  }

  export async function verifySignedListingPSBTBase64(
    req: IRunePostPSBTListing,
    // feeProvider: runeFeeProvider,
    makerFeeBp: number,
    // itemProvider: runeItemProvider,
    runeItem: IRuneItem,
  ): Promise<boolean> {
    const psbt = bitcoin.Psbt.fromBase64(req.signedListingPSBTBase64, {
      network,
    });

    // Verify that the seller has signed the PSBT if runeicals is held on a taproot and tapInternalKey is present
    psbt.data.inputs.forEach(input => {
      if (input.tapInternalKey) {
        const finalScriptWitness = input.finalScriptWitness;

        if (finalScriptWitness && finalScriptWitness.length > 0) {
          // Validate that the finalScriptWitness is not empty (and not just the initial value, without the tapKeySig)
          if (finalScriptWitness.toString('hex') === '0141') {
            throw new InvalidArgumentError(`Invalid signature - no taproot signature present on the finalScriptWitness`);
          }
        } else {
          throw new InvalidArgumentError(`Invalid signature - no finalScriptWitness`);
        }
      }
    });

    // verify signatures valid, so that the psbt is signed by the item owner
    if ((await FullnodeRPC.analyzepsbt(req.signedListingPSBTBase64))?.inputs[0]?.is_final !== true) {
      throw new InvalidArgumentError(`Invalid signature`);
    }

    // verify that the input's sellerOrdAddress is the same as the sellerOrdAddress of the utxo
    if (psbt.inputCount !== 1) {
      throw new InvalidArgumentError(`Invalid number of inputs`);
    }
    const utxoOutput = generateTxidFromHash(psbt.txInputs[0].hash) + ':' + psbt.txInputs[0].index;

    // verify that the runId is the same as the seller wants
    // const runeItem = await itemProvider.getTokenByOutput(utxoOutput);
    if (runeItem?.id !== req.id || utxoOutput !== `${runeItem.txid}:${runeItem.vout}`) {
      throw new InvalidArgumentError(`Invalid tokenId`);
    }

    // verify that the ordItem's selling price matches the output value with makerFeeBp
    const output = psbt.txOutputs[0];
    const expectedOutput = getSellerRuneOutputValue(
      req.price,
      makerFeeBp, // await feeProvider.getMakerFeeBp(runeItem.owner),
      runeItem.outputValue,
    );
    if (output.value !== expectedOutput) {
      throw new InvalidArgumentError(`Invalid price`);
    }

    // verify that the output address is the same as the seller's receive address
    if (output.address !== req.sellerReceiveAddress) {
      throw new InvalidArgumentError(`Invalid sellerReceiveAddress`);
    }

    // verify that the seller address is a match
    const sellerAddressFromPSBT = bitcoin.address.fromOutputScript(
      bitcoin.Transaction.fromHex(await FullnodeRPC.getrawtransaction(generateTxidFromHash(psbt.txInputs[0].hash))).outs[psbt.txInputs[0].index]
        .script,
      network,
    );
    if (runeItem?.owner !== sellerAddressFromPSBT) {
      throw new InvalidArgumentError(`Invalid seller address`);
    } else {
      return true;
    }
  }
}
