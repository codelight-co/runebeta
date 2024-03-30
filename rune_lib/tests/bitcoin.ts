import * as ecc from "@bitcoinerlab/secp256k1"
import { ECPairFactory, ECPairInterface } from "ecpair"
import * as bitcoin from "bitcoinjs-lib"
import { Network, Psbt, script as bsscript } from "bitcoinjs-lib"
import { UTXO } from "./mempool"
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371"

bitcoin.initEccLib(ecc)
const ECPair = ECPairFactory(ecc)

export function toP2TRAddress(pubkey: Buffer, network: Network) {
  return bitcoin.payments.p2tr({
    internalPubkey: pubkey.slice(1, 33),
    network,
  }).address
}

export function toTaprootInput(
  utxo: UTXO,
  pubkey: Buffer,
  script: Buffer,
  payments: bitcoin.payments.Payment,
  witnessScript: Buffer,
) {
  if (witnessScript.length) {
    return {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { value: utxo.value, script: script },
      tapLeafScript: [
        {
          leafVersion: 192,
          script: witnessScript,
          controlBlock: payments?.witness![payments?.witness!.length - 1],
        },
      ],
    }
  }

  return {
    hash: utxo.txid,
    index: utxo.vout,
    witnessUtxo: { value: utxo.value, script: script },
    tapInternalKey: pubkey,
  }
}

export const DUST_AMOUNT = 546

const BASE_BYTES = 10.5
const INPUT_BYTES_BASE = 57.5
const OUTPUT_BYTES_BASE = 43

export function calcP2TRFee(
  feeRate: number,
  inputs: number,
  outputs: number,
): {
  fee: number
  weight: number
} {
  const fee = Math.ceil(
    feeRate *
      (BASE_BYTES + inputs * INPUT_BYTES_BASE + outputs * OUTPUT_BYTES_BASE),
  )
  return {
    fee,
    weight: (fee * 4) / feeRate,
  }
}

export function tryTaprootTxInputs(
  utxos: UTXO[],
  amount: number,
  feeRate: number,
  inputs: number,
  outputs: number,
  minFee: number = 220,
) {
  let ins: UTXO[] = []
  const check = (r: number) => {
    if (r <= 0) {
      return
    }
    let fee = calcP2TRFee(feeRate, ins.length + inputs, outputs)
    let rawFee = Math.max(fee.fee, minFee)
    let v = r - rawFee
    if (v >= DUST_AMOUNT) {
      let newFee = calcP2TRFee(feeRate, ins.length + inputs, outputs + 1)
      rawFee = Math.max(newFee.fee, minFee)
      let nr = r - rawFee
      if (nr >= DUST_AMOUNT) {
        return { inputs: ins, fee: rawFee, change: nr }
      }
      return { inputs: ins, fee: r, change: 0 }
    } else if (v >= 0) {
      return { inputs: ins, fee: r, change: 0 }
    }
  }
  let value = 0
  let r = value - amount
  let checked = check(r)
  if (checked) {
    return checked
  }
  for (let utxo of utxos) {
    value += utxo.value
    ins.push(utxo)
    r = value - amount
    checked = check(r)
    if (checked) {
      return checked
    }
  }
  throw Error("Not enough funds")
}

export function toTaprootPSBT(
  inputs: UTXO[],
  outputs: {
    script: Buffer
    value: number
  }[],
  script: Buffer,
  pubkey: Buffer,
  network: Network,
  payments: bitcoin.payments.Payment,
  witnessScript: Buffer,
  rbf: boolean = true,
) {
  let psbt = new bitcoin.Psbt({ network })
  psbt.setVersion(2)
  for (let i = 0; i < inputs.length; i++) {
    let input = toTaprootInput(
      inputs[i],
      pubkey,
      script,
      payments,
      witnessScript,
    )
    psbt.addInput(
      rbf
        ? {
            ...input,
            sequence: 0xfffffffd,
          }
        : input,
    )
  }
  for (let output of outputs) {
    psbt.addOutput(output)
  }
  return psbt
}

export function signTaprootPSBT(signer: any, psbt: Psbt, hash?: Buffer) {
  const childNodeXOnlyPubkey = toXOnly(signer.publicKey)
  const tweakedSigner = signer.tweak(
    bitcoin.crypto.taggedHash(
      "TapTweak",
      Buffer.concat([childNodeXOnlyPubkey, hash!]),
    ),
  )
  for (let i = 0; i < psbt.data.inputs.length; i++) {
    psbt.signInput(i, signer)
    psbt.finalizeInput(i)
  }
  return psbt
}

export { bitcoin, ECPair }
