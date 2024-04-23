import { BASE_URL } from "../src/configs/constant"
import { RPCService, network } from "../src/utils/rpc"
import { FullnodeRPC } from "../src/vendors/fullnoderpc"
import { toXOnly } from "../src/utils/util"
import { getSellerRuneOutputValue } from "../src/vendors/feeprovider"
import * as bitcoin from "bitcoinjs-lib"
import * as ecc from "@bitcoinerlab/secp256k1"
import { ECPairFactory, ECPairInterface } from "ecpair"
import { signTaprootPSBT, toP2TRAddress } from "../../../rune_lib/tests/bitcoin"

describe("Services", () => {
  bitcoin.initEccLib(ecc)
  const ECPair = ECPairFactory(ecc)
  const wif = "cQtwjvxSgkT5awKKNeNSjfw7ccPvYovxX3e7Aw8KehbvxJdvAJQG"
  const signer = ECPair.fromWIF(wif, network)
  let pubkey = signer.publicKey
  let address = toP2TRAddress(pubkey, network)!

  console.log("address :>> ", address)

  test("validated right address", () => {
    expect(address).toBe(
      "tb1p5kp2dqj6xpgyx0fqf5xsfkmnvvhw3m7ar2ghaf5qrcq3xje698nswgxz63",
    )
  })

  test("signedListingPSBTBase64", async () => {
    const service = new RPCService(BASE_URL, bitcoin.networks.testnet)
    const listing = {
      seller: {
        makerFeeBp: 24,
        sellerRuneAddress:
          "tb1p5kp2dqj6xpgyx0fqf5xsfkmnvvhw3m7ar2ghaf5qrcq3xje698nswgxz63",
        price: 200,
        runeItem: {
          txid: "cf3380bb7453de9a07fa16e907d74bdb8bc1b8186fab25aeab2685cf6ae0ef80",
          vout: 1,
          outputValue: 10,
        },
        sellerReceiveAddress:
          "tb1p5kp2dqj6xpgyx0fqf5xsfkmnvvhw3m7ar2ghaf5qrcq3xje698nswgxz63",
        tapInternalKey: null,
        publicKey: null,
        unsignedListingPSBTBase64: "",
      },
    }
    const psbt = new bitcoin.Psbt({ network })
    const runeUtxoTxId = listing.seller.runeItem.txid
    const runeUtxoVout = listing.seller.runeItem.vout
    const tx = bitcoin.Transaction.fromHex(
      await FullnodeRPC.getrawtransaction(runeUtxoTxId),
    )

    // No need to add this witness if the seller is using taproot
    if (!listing.seller.tapInternalKey && !listing.seller.publicKey) {
      for (const output in tx.outs) {
        try {
          tx.setWitness(parseInt(output), [])
        } catch {}
      }
    }

    const input: any = {
      hash: runeUtxoTxId,
      index: runeUtxoVout,
      nonWitnessUtxo: tx.toBuffer(),
      // No problem in always adding a witnessUtxo here
      witnessUtxo: tx.outs[runeUtxoVout],
      sighashType:
        bitcoin.Transaction.SIGHASH_SINGLE |
        bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    }
    // If taproot is used, we need to add the internal key
    if (listing.seller.tapInternalKey && !listing.seller.publicKey) {
      input.tapInternalKey = toXOnly(
        tx.toBuffer().constructor(listing.seller.tapInternalKey, "hex"),
      )
    } else if (!listing.seller.tapInternalKey && listing.seller.publicKey) {
      input.tapInternalKey = toXOnly(
        tx
          .toBuffer()
          .constructor(
            toXOnly(Buffer.from(listing.seller.publicKey, "hex")),
            "hex",
          ),
      )
    }

    psbt.addInput(input)

    const sellerOutput = getSellerRuneOutputValue(
      listing.seller.price,
      listing.seller.makerFeeBp,
      listing.seller.runeItem.outputValue,
    )

    psbt.addOutput({
      address: listing.seller.sellerReceiveAddress,
      value: sellerOutput,
    })

    const signed = signTaprootPSBT(signer, psbt, pubkey)
    const syncedPsbtBase64 = signed.toBase64()
    console.log("syncedPsbtBase64 :>> ", syncedPsbtBase64)
  })
})
