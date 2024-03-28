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

const tinysecp: TinySecp256k1Interface = require("tiny-secp256k1")
initEccLib(tinysecp as any)
const ECPair: ECPairAPI = ECPairFactory(tinysecp)

function tweakSigner(signer: Signer, opts: any = {}): Signer {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let privateKey: Uint8Array | undefined = signer.privateKey!
  if (!privateKey) {
    throw new Error("Private key is required for tweaking signer!")
  }
  if (signer.publicKey[0] === 3) {
    privateKey = tinysecp.privateNegate(privateKey)
  }

  const tweakedPrivateKey = tinysecp.privateAdd(
    privateKey,
    tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash),
  )
  if (!tweakedPrivateKey) {
    throw new Error("Invalid tweaked private key!")
  }

  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
    network: opts.network,
  })
}

function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer {
  return crypto.taggedHash(
    "TapTweak",
    Buffer.concat(h ? [pubKey, h] : [pubKey]),
  )
}

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
  const tweakedSigner = tweakSigner(signer, { network })
  // const p2pktr = payments.p2tr({
  //   pubkey: toXOnly(tweakedSigner.publicKey),
  //   network,
  // })

  const witnessScript = buildWitnessScript({
    recover: false,
    mediaType: "text/plain",
    mediaContent: "Hello Wolrd!",
    xkey: tweakedSigner.publicKey.toString("hex"),
    meta: null,
  })
  const witnessScriptRecovery = buildWitnessScript({
    recover: true,
    mediaType: "text/plain",
    mediaContent: "Hello Wolrd!",
    xkey: tweakedSigner.publicKey.toString("hex"),
    meta: null,
  })
  const p2pktr = bitcoin.payments.p2tr({
    internalPubkey: toXOnly(signer.publicKey),
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
  const address = p2pktr.address ?? ""
  console.log("p2pktr_addr :>> ", address)

  let pubkey = tweakedSigner.publicKey
  const output = p2pktr.output as Buffer
  console.log({
    pubkey: pubkey.toString("hex"),
    address,
  })

  it("test issue tokens(fixedcap)", async () => {
    let utxos = await getUTXOs(address, network)
    console.table(utxos)

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
    const encipher = runeStone.encipher()
    const outputs = [
      {
        script: encipher,
        value: 0,
      },
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
      outputs.length,
    )
    console.table({ amount, fee, change })
    if (change) {
      outputs.push({
        script: output,
        value: change,
      })
    }
    let psbt = toTaprootPSBT(inputs, outputs, output, pubkey, network, p2pktr)
    let signed = signTaprootPSBT(tweakedSigner, psbt, tweakedSigner.publicKey)
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

  //   it('test issue tokens(fairmint)', async () => {
  //     let utxos = await getUTXOs(address, network);
  //     console.table(utxos);
  //     let rune = Rune.fromString('HELLOEVA');
  //     const runeStone = new RuneStone(
  //       [],
  //       new Etching(
  //         // like decimals.
  //         8,
  //         new Mint(
  //           // mint end time.
  //           BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
  //           // maximum amount for each mint.
  //           BigInt(1e8),
  //           // the block at which minting ends.
  //           BigInt(1e8),
  //         ),
  //         // the name of the token, if null, it will be automatically generated.
  //         rune,
  //         // this is not the name of the token, only one character is supported here
  //         '$',
  //         BigInt(0),
  //       ), // etching
  //       false, // is burning? true/false
  //       null, // claim
  //       null, // default output
  //     );
  //     const encipher = runeStone.encipher();
  //     const outputs = [
  //       {
  //         script: encipher,
  //         value: 0,
  //       },
  //       {
  //         script: output,
  //         value: 1,
  //       },
  //     ];
  //     let amount = outputs.reduce((a, b) => a + b.value, 0);
  //     const { inputs, fee, change } = tryTaprootTxInputs(utxos, amount, feeRate, 0, outputs.length);
  //     console.table({ amount, fee, change });
  //     if (change) {
  //       outputs.push({
  //         script: output,
  //         value: change,
  //       });
  //     }
  //     let psbt = toTaprootPSBT(inputs, outputs, output, pubkey, network);
  //     let signed = signTaprootPSBT(signer, psbt, pubkey);
  //     let tx = signed.extractTransaction();
  //     console.table({
  //       txid: tx.getId(),
  //       fee: psbt.getFee(),
  //       feeRate: psbt.getFeeRate(),
  //     });
  //     const rawhex = tx.toHex();
  //     console.log(rawhex);
  //     let stone = RuneStone.fromTransaction(tx);
  //     console.log(stone);
  //     // let txid = await broadcast(rawhex, network);
  //     // console.log(txid);
  //   });

  //   it('test mint tokens', async () => {
  //     let utxos = await getUTXOs(address, network);
  //     console.table(utxos);
  //     // etching block height | etching transaction index
  //     let runeId = new RuneId(BigInt(2582757), 389);
  //     const runeStone = new RuneStone(
  //       [], // edicts
  //       null, // etching
  //       false, // is burning? true/false
  //       RuneId.toBigInt(runeId), // claim
  //       null, // default output
  //     );
  //     const encipher = runeStone.encipher();
  //     const outputs = [
  //       {
  //         script: encipher,
  //         value: 0,
  //       },
  //       {
  //         script: output,
  //         value: 1,
  //       },
  //     ];
  //     let amount = outputs.reduce((a, b) => a + b.value, 0);
  //     const { inputs, fee, change } = tryTaprootTxInputs(utxos, amount, feeRate, 0, outputs.length);
  //     console.table({ amount, fee, change });
  //     if (change) {
  //       outputs.push({
  //         script: output,
  //         value: change,
  //       });
  //     }
  //     console.table(inputs);
  //     console.table(outputs);
  //     let psbt = toTaprootPSBT(inputs, outputs, output, pubkey, network);
  //     let signed = signTaprootPSBT(signer, psbt, pubkey);
  //     let tx = signed.extractTransaction();
  //     console.table({
  //       txid: tx.getId(),
  //       fee: psbt.getFee(),
  //       feeRate: psbt.getFeeRate(),
  //     });
  //     const rawhex = tx.toHex();
  //     console.log(rawhex);
  //     let stone = RuneStone.fromTransaction(tx);
  //     console.log(stone);
  //     // let txid = await broadcast(rawhex, network);
  //     // console.log(txid);
  //   });
  //   it('test transfer tokens', async () => {
  //     let utxos = await getUTXOs(address, network);
  //     console.table(utxos);
  //     // balance location: txid:vout
  //     const location = ':1';
  //     let input = utxos.find(e => e.txid + ':' + e.vout === location)!;
  //     // etching block height | etching transaction index
  //     let runeId = new RuneId(BigInt(2582645), 839);
  //     const runeStone = new RuneStone(
  //       [
  //         {
  //           id: RuneId.toBigInt(runeId),
  //           amount: BigInt(100),
  //           output: BigInt(1),
  //         } as any,
  //       ], // edicts
  //       null, // etching
  //       false, // is burning? true/false
  //       null, // claim
  //       null, // default output
  //     );
  //     const encipher = runeStone.encipher();
  //     const outputs = [
  //       {
  //         script: encipher,
  //         value: 0,
  //       },
  //       {
  //         script: output,
  //         value: 1,
  //       },
  //       {
  //         script: output,
  //         value: input.value,
  //       },
  //     ];
  //     let amount = outputs.reduce((a, b) => a + b.value, 0) - input.value;
  //     const { inputs, fee, change } = tryTaprootTxInputs(utxos, amount, feeRate, 1, outputs.length);
  //     console.table({ amount, fee, change });
  //     if (change) {
  //       outputs.push({
  //         script: output,
  //         value: change,
  //       });
  //     }
  //     let finalInputs = [input, ...inputs];
  //     console.table(finalInputs);
  //     console.table(outputs);
  //     let psbt = toTaprootPSBT(finalInputs, outputs, output, pubkey, network);
  //     let signed = signTaprootPSBT(signer, psbt, pubkey);
  //     let tx = signed.extractTransaction();
  //     console.table({
  //       txid: tx.getId(),
  //       fee: psbt.getFee(),
  //       feeRate: psbt.getFeeRate(),
  //     });
  //     const rawhex = tx.toHex();
  //     console.log(rawhex);
  //     let stone = RuneStone.fromTransaction(tx);
  //     console.log(stone);
  //     // let txid = await broadcast(rawhex, network);
  //     // console.log(txid);
  //   });

  //   it('test burn tokens', async () => {
  //     let utxos = await getUTXOs(address, network);
  //     console.table(utxos);
  //     // balance location: txid:vout
  //     const location = ':1';
  //     let input = utxos.find(e => e.txid + ':' + e.vout === location)!;
  //     const runeStone = new RuneStone(
  //       [], // edicts
  //       null, // etching
  //       true, // is burning? true/false
  //       null, // claim
  //       null, // default output
  //     );
  //     const encipher = runeStone.encipher();
  //     const outputs = [
  //       {
  //         script: encipher,
  //         value: 0,
  //       },
  //     ];
  //     let amount = outputs.reduce((a, b) => a + b.value, 0) - input!.value;
  //     const { inputs, fee, change } = tryTaprootTxInputs(utxos, amount, feeRate, 1, outputs.length);
  //     console.table({ amount, fee, change });
  //     if (change) {
  //       outputs.push({
  //         script: output,
  //         value: change,
  //       });
  //     }
  //     let finalInputs = [input, ...inputs];
  //     console.table(finalInputs);
  //     console.table(outputs);
  //     let psbt = toTaprootPSBT(finalInputs, outputs, output, pubkey, network);
  //     let signed = signTaprootPSBT(signer, psbt, pubkey);
  //     let tx = signed.extractTransaction();
  //     console.table({
  //       txid: tx.getId(),
  //       fee: psbt.getFee(),
  //       feeRate: psbt.getFeeRate(),
  //     });
  //     const rawhex = tx.toHex();
  //     console.log(rawhex);
  //     let stone = RuneStone.fromTransaction(tx);
  //     console.log(stone);
  //     // let txid = await broadcast(rawhex, network);
  //     // console.log(txid);
  //   });
  // });
})
