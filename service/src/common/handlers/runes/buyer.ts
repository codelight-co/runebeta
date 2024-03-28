import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import { IRuneListingState, InvalidArgumentError, WitnessUtxo } from './types';
import { RPCService, network } from 'src/common/utils/rpc';
import { satToBtc, isP2SHAddress, toXOnly } from 'src/common/utils/util';
import { RUNE_TAG, DUST_AMOUNT, PLATFORM_FEE_ADDRESS } from 'src/environments';
import {
  calculateTxBytesFee,
  getSellerRuneOutputValue,
} from 'src/vendors/feeprovider';
import { FullnodeRPC } from 'src/vendors/fullnoderpc';
import { Edict, RuneId, RuneStone } from 'rune_lib';

bitcoin.initEccLib(ecc);

export interface TokenOutput {
  id: number;
  value: number;
  address: string;
}

export interface SellerOutput {
  id: number;
  value: number;
  address: string;
}

export interface SellerInput {
  hash: string;
  index: number;
  nonWitnessUtxo?: Buffer;
  // No problem in always adding a witnessUtxo here
  witnessUtxo?: Buffer;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BuyerHandler {
  async function doesUtxoContainRunes(
    utxo: AddressTxsUtxo,
    service: RPCService,
  ): Promise<boolean> {
    // If it's confirmed, we check the indexing db for that output
    if (utxo.status.confirmed) {
      try {
        return (
          (await service.getRuneByTxIdAndIndex(utxo.txid, utxo.vout)) !== null
        );
      } catch (err) {
        return true; // if error, we pretend that the utxo contains an inscription for safety
      }
    }

    // if it's not confirmed, we search the input script for the inscription
    const tx = await FullnodeRPC.getrawtransactionVerbose(utxo.txid);
    let foundRunes = false;
    for (const input of tx.vin) {
      if (
        (await FullnodeRPC.getrawtransactionVerbose(input.txid))
          .confirmations === 0
      ) {
        return true; // to error on the safer side, and treat this as possible to have a inscription
      }
      try {
        if (
          (await service.getRuneByTxIdAndIndex(input.txid, input.vout)) !== null
        ) {
          foundRunes = true;
          return foundRunes;
        }
      } catch (err) {
        return true; // if error, we pretend that the utxo contains an inscription for safety
      }
    }

    return foundRunes;
  }

  export async function selectPaymentUTXOs(
    utxos: AddressTxsUtxo[],
    amount: number, // amount is expected total output (except tx fee)
    vinsLength: number,
    voutsLength: number,
    feeRateTier: string,
    service: RPCService,
  ): Promise<AddressTxsUtxo[]> {
    const selectedUtxos: AddressTxsUtxo[] = [];
    let selectedAmount = 0;

    // Sort descending by value,
    utxos = utxos.sort((a, b) => b.value - a.value);

    for (const utxo of utxos) {
      // Never spend a utxo that contains an atoms for cardinal purposes
      if (await doesUtxoContainRunes(utxo, service)) {
        continue;
      }

      // TODO - check if the utxo contains runes

      selectedUtxos.push(utxo);
      selectedAmount += utxo.value;

      if (
        selectedAmount >=
        amount +
          (await calculateTxBytesFee(
            vinsLength + selectedUtxos.length,
            voutsLength,
            feeRateTier,
          ))
      ) {
        break;
      }
    }

    if (selectedAmount < amount) {
      throw new InvalidArgumentError(`Not enough cardinal spendable funds.
  Address has:  ${satToBtc(selectedAmount)} BTC
  Needed:       ${satToBtc(amount)} BTC`);
    }

    return selectedUtxos;
  }

  /// generateUnsignedBuyingPSBTBase64

  export async function generateUnsignedBuyingPSBTBase64(
    buyer_state: IRuneListingState,
    seller_items: IRuneListingState[],
  ) {
    const psbt = new bitcoin.Psbt({ network });
    if (
      !buyer_state.buyer ||
      !buyer_state.buyer.buyerAddress ||
      !buyer_state.buyer.buyerTokenReceiveAddress
    ) {
      throw new InvalidArgumentError('Buyer address is not set');
    }

    /// List all Seller's items
    if (seller_items.length === 0) {
      throw new InvalidArgumentError('Sellers not found');
    }

    const _seller_inputs: SellerInput[] = [];
    const _seller_outputs: SellerOutput[] = [];
    let _platform_fee = 0;
    let _seller_listing_prices = 0;
    let _seller_total_tokens = BigInt(0);

    for (let i = 0; i < seller_items.length; i++) {
      const seller = seller_items[i];
      if (
        !seller.seller ||
        !seller.seller.sellerReceiveAddress ||
        !seller.seller.runeItem ||
        !seller.seller.runeItem.txid ||
        seller.seller.runeItem.vout === undefined ||
        seller.seller.runeItem.vout === null
      ) {
        throw new InvalidArgumentError('Seller address is not set');
      }
      const { sellerInput, sellerOutput } =
        await getSellerInputAndOutput(seller);
      _seller_inputs.push(sellerInput);
      /// push all seller item as inputs to psbt

      //   const _token_output: TokenOutput = {
      //     id: seller.seller.runeItem.id, // runes ID
      //     value: seller.seller.runeItem.outputValue, // runes value
      //     address: buyer_state.buyer.buyerTokenReceiveAddress, // buyer receiveAddress
      //   };
      _seller_outputs.push(sellerOutput);
      _platform_fee += Math.floor(
        (seller.seller.price *
          (buyer_state.buyer.takerFeeBp + seller.seller.makerFeeBp)) /
          10000,
      );
      _seller_listing_prices += seller.seller.price;
      _seller_total_tokens += BigInt(seller.seller.runeItem.tokenValue);
      /// push _token_output to _token_outputs,and sort them later, and join FT value together
    }

    /// Step 5, add buyer BTC input
    let total_buyer_inputs_value = 0;
    const _buyers_inputs: SellerInput[] = [];

    for (const utxo of buyer_state.buyer.buyerPaymentUTXOs!) {
      const input: any = {
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: bitcoin.Transaction.fromHex(
          await FullnodeRPC.getrawtransaction(utxo.txid),
        ).toBuffer(),
      };

      const p2shInputWitnessUTXOUn: any = {};
      const p2shInputRedeemScriptUn: any = {};
      if (isP2SHAddress(buyer_state.buyer.buyerAddress, network)) {
        const redeemScript = bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(buyer_state.buyer.buyerPublicKey!, 'hex'),
        }).output;
        const p2sh = bitcoin.payments.p2sh({
          redeem: { output: redeemScript },
        });
        p2shInputWitnessUTXOUn.witnessUtxo = {
          script: p2sh.output,
          value: utxo.value,
        } as WitnessUtxo;
        p2shInputRedeemScriptUn.redeemScript = p2sh.redeem?.output;
      }
      _buyers_inputs.push({
        ...input,
        ...p2shInputWitnessUTXOUn,
        ...p2shInputRedeemScriptUn,
      });
      total_buyer_inputs_value += utxo.value;
    }

    /// TODO adding OP_RETURN here
    const runeItemId = seller_items[0]?.seller?.runeItem?.id?.toString();
    const runeId = RuneId.fromString(runeItemId);
    if (!runeId) {
      throw new Error('Invalid Rune ID');
    }

    const edict = new Edict(
      runeId as RuneId,
      BigInt(_seller_outputs.length + 2),
      _seller_total_tokens,
    );
    const rs = new RuneStone([edict], null, false, null, null);

    const op_return_output = {
      value: 0,
      script: rs.encipher(),
    };

    /// Step 6, add platform BTC input
    _platform_fee = _platform_fee > DUST_AMOUNT ? _platform_fee : 0;

    const platform_output = {
      address: PLATFORM_FEE_ADDRESS,
      value: _platform_fee,
    };

    /// Adding all Inputs:
    const _all_inputs = [..._seller_inputs, ..._buyers_inputs];
    for (let i = 0; i < _all_inputs.length; i++) {
      psbt.addInput(_all_inputs[i] as any);
    }
    /// Adding all Outputs except change fee:

    const _all_outputs_except_change = [
      ..._seller_outputs,
      op_return_output,
      // platform_output,
    ];
    for (let i = 0; i < _all_outputs_except_change.length; i++) {
      psbt.addOutput(_all_outputs_except_change[i] as any);
    }

    /// Adding change fee:
    const fee = await calculateTxBytesFee(
      psbt.txInputs.length,
      psbt.txOutputs.length, // already taken care of the exchange output bytes calculation
      buyer_state.buyer.feeRateTier,
    );
    const totalOutput = psbt.txOutputs.reduce(
      (partialSum, a) => partialSum + a.value,
      0,
    );
    const changeValue = total_buyer_inputs_value - totalOutput - fee;
    if (changeValue < 0) {
      throw `Your wallet address doesn't have enough funds to buy this inscription.
  Price:      ${satToBtc(_seller_listing_prices)} BTC
  Required:   ${satToBtc(totalOutput + fee)} BTC
  Missing:    ${satToBtc(-changeValue)} BTC`;
    }

    // Change utxo
    if (changeValue > DUST_AMOUNT) {
      psbt.addOutput({
        address: buyer_state.buyer.buyerAddress,
        value: changeValue,
      });
    }

    buyer_state.buyer.unsignedBuyingPSBTBase64 = psbt.toBase64();
    buyer_state.buyer.unsignedBuyingPSBTInputSize = psbt.data.inputs.length;
    buyer_state.buyer.itemMapping = _seller_outputs.map((e, i) => {
      return {
        index: i,
        id: e.id!,
      };
    });

    return buyer_state;
  }

  async function getSellerInputAndOutput(listing: IRuneListingState) {
    const [runesUtxoTxId, runesUtxoVout] = [
      listing.seller.runeItem.txid,
      listing.seller.runeItem.vout,
    ];
    const tx = bitcoin.Transaction.fromHex(
      await FullnodeRPC.getrawtransaction(runesUtxoTxId),
    );
    // No need to add this witness if the seller is using taproot

    if (!listing.seller.tapInternalKey && !listing.seller.publicKey) {
      for (let outputIndex = 0; outputIndex < tx.outs.length; outputIndex++) {
        try {
          tx.setWitness(outputIndex, []);
        } catch {}
      }
    }

    const sellerInput: any = {
      hash: runesUtxoTxId,
      index: runesUtxoVout,
      nonWitnessUtxo: tx.toBuffer(),
      // No problem in always adding a witnessUtxo here
      witnessUtxo: tx.outs[runesUtxoVout],
    };
    // If taproot is used, we need to add the internal key

    // If taproot is used, we need to add the internal key
    if (listing.seller.tapInternalKey && !listing.seller.publicKey) {
      sellerInput.tapInternalKey = toXOnly(
        tx.toBuffer().constructor(listing.seller.tapInternalKey, 'hex'),
      );
    } else if (!listing.seller.tapInternalKey && listing.seller.publicKey) {
      sellerInput.tapInternalKey = toXOnly(
        tx
          .toBuffer()
          .constructor(
            toXOnly(Buffer.from(listing.seller.publicKey, 'hex')),
            'hex',
          ),
      );
    }

    const ret = {
      sellerInput,
      sellerOutput: {
        id: listing.seller.runeItem.id,
        address: listing.seller.sellerReceiveAddress,
        value: getSellerRuneOutputValue(
          listing.seller.price,
          listing.seller.makerFeeBp,
          listing.seller.runeItem.outputValue,
        ),
      },
    };

    return ret;
  }
}
