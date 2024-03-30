import {
  bitcoin,
  signTaprootPSBT,
  toP2TRAddress,
  toTaprootPSBT,
  tryTaprootTxInputs,
} from "./bitcoin"
import { getUTXOs } from "./mempool"
import { Edict, Etching, Rune, RuneId, RuneStone } from "../src"
import ECPairFactory, {
  ECPairAPI,
  Signer,
  TinySecp256k1Interface,
} from "ecpair"
import { initEccLib, crypto, payments, script } from "bitcoinjs-lib"
import { buildWitnessScript } from "../src/witness"
import BIP32Factory from "bip32"
import * as ecc from "tiny-secp256k1"
import * as varint from "../src/index"

const bip32 = BIP32Factory(ecc)
const rng = require("randombytes")

const tinysecp: TinySecp256k1Interface = require("tiny-secp256k1")
initEccLib(tinysecp as any)
const ECPair: ECPairAPI = ECPairFactory(tinysecp)

function toXOnly(pubkey: Buffer): Buffer {
  return pubkey.subarray(1, 33)
}

describe("Issue/Mint/Transfer/Burn", () => {
  // replace with your own private key
  const wif = "cMqEPEFTrnrK8cFz1y2czWYyHkApnWrnEb34eD3Mu2XWZJr9vEwx"
  // replace with your own network
  const network = bitcoin.networks.testnet
  // replace with your own fee rate
  const feeRate = 1
  const signer = ECPair.fromWIF(wif, network)
  const childNodeXOnlyPubkey = toXOnly(signer.publicKey)
  const key =
    "eb59e4c51143a157d701b6f357f1dce348bf0907b1c18ee850451989238ff08c7ec452edcfbd35e71973b4b0e2849234e8ad36610e4ac371ea8a02beafd8562f"

  // contvert key hex to buffer
  const leafKey = bip32.fromSeed(Buffer.from(key, "hex"), network)
  const leafPubkey = toXOnly(leafKey.publicKey).toString("hex")

  it("test issue tokens(fixedcap)", async () => {
    // the name of the token
    let rune = Rune.fromString("HELLOFIXEDCAP")
    const edict = new Edict(
      new RuneId(BigInt(0), BigInt(0)),
      BigInt(1e8),
      BigInt(1),
    )
    const etching = new Etching({
      divisibility: 2,
      rune,
      symbol: "$",
    })
    const runeStone = new RuneStone({
      edicts: [edict],
      etching,
      cenotaph: false,
      mint: null,
      pointer: null,
    })
    let encode = varint.encode(rune.id)
    console.log("Encoded rune name", Buffer.from(encode).toString("hex")) //This is ok
    let res = varint.decode2Commitment(encode)
    console.log("Decode commitment result", res)
    let [decode, number] = varint.decode(encode)
    console.log(decode, number)
    let commitment = varint.bigintToLEBytes(res[0])
    console.log("Commitment:", commitment)

    const witnessScript = buildWitnessScript({
      recover: false,
      mediaType: "text/plain",
      mediaContent: rune.toString(),
      xkey: leafPubkey,
      commitment: Buffer.from(commitment),
      meta: null,
    })
    const witnessScriptRecovery = buildWitnessScript({
      recover: true,
      mediaType: "text/plain",
      mediaContent: rune.toString(),
      commitment: Buffer.from(commitment),
      xkey: leafPubkey,
      meta: null,
    })
    const p2pktr = bitcoin.payments.p2tr({
      internalPubkey: childNodeXOnlyPubkey,
      network,
      scriptTree: [
        {
          output: witnessScript,
        },
        {
          output: witnessScriptRecovery,
        },
      ],
      redeem: {
        output: witnessScript,
        redeemVersion: 192,
      },
    })

    const address = p2pktr.address as string

    // Deposit to this address
    console.log("Deposit address :>> ", address)

    const output = p2pktr.output as Buffer
    console.log({
      pubkey: childNodeXOnlyPubkey.toString("hex"),
      address,
    })

    let utxos = await getUTXOs(address, network)
    console.table(utxos)

    const encipher = runeStone.encipher()
    const outputs = [
      {
        // receiver
        script: output,
        value: 1,
      },
    ]
    let amount = outputs.reduce((a, b) => a + b.value, 0)
    const { inputs, fee, change } = tryTaprootTxInputs(
      utxos,
      amount,
      feeRate,
      1,
      outputs.length + 1,
    )
    console.table({ amount, fee, change })
    if (change) {
      outputs.push({
        script: output,
        value: change,
      })
    }

    outputs.push({
      script: encipher,
      value: 0,
    })
    let psbt = toTaprootPSBT(
      inputs,
      outputs,
      output,
      childNodeXOnlyPubkey,
      network,
      p2pktr,
      witnessScript,
    )

    let signed = signTaprootPSBT(leafKey, psbt, p2pktr.hash)
    let tx = signed.extractTransaction()
    console.table({
      txid: tx.getId(),
      fee: psbt.getFee(),
      feeRate: psbt.getFeeRate(),
    })
    const rawhex = tx.toHex()
    console.log(rawhex)
    let stone = RuneStone.fromTransaction(tx)
    console.log(stone)
    // let txid = await broadcast(rawhex, network);
    // console.log(txid);
  })
})
