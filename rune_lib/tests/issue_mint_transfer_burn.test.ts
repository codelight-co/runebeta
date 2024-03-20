import {bitcoin, ECPair, signTaprootPSBT, toP2TRAddress, toTaprootPSBT, tryTaprootTxInputs} from "./bitcoin";
import {getUTXOs} from "./mempool";
import {Etching, Rune, RuneId, RuneStone} from "../src";
import {Mint} from "../src/mint";

describe('Issue/Mint/Transfer/Burn', () => {
    // replace with your own private key
    const wif = '';
    // replace with your own network
    const network = bitcoin.networks.testnet;
    // replace with your own fee rate
    const feeRate = 1;
    const signer = ECPair.fromWIF(wif, network);
    let pubkey = signer.publicKey;
    let address = toP2TRAddress(pubkey, network)!;
    const output = bitcoin.address.toOutputScript(address, network);
    console.log({
        pubkey: pubkey.toString('hex'),
        address
    });

    it('test issue tokens', async () => {
        let utxos = await getUTXOs(address, network);
        console.table(utxos);
        const runeStone = new RuneStone(
            [{
                id: BigInt(0),
                amount: BigInt(1000000),
                output: BigInt(1),
            } as any], // edicts
            new Etching(0, new Mint(BigInt(Date.now() * 1e6), BigInt(1000000), BigInt(2582653 + 10000)), null, 'xyzd', BigInt(0)), // etching
            false, // is burning? true/false
            null, // claim
            null, // default output
        );
        runeStone.setTag('RUNE_TEST');
        const encipher = runeStone.encipher();
        const outputs = [
            {
                script: encipher,
                value: 0,
            },
            {
                script: output,
                value: 1,
            }
        ];
        let amount = outputs.reduce((a, b) => a + b.value, 0);
        const {inputs, fee, change} = tryTaprootTxInputs(utxos, amount, feeRate, 0, outputs.length);
        console.table({amount, fee, change});
        if (change) {
            outputs.push({
                script: output,
                value: change
            });
        }
        let psbt = toTaprootPSBT(inputs, outputs, output, pubkey, network);
        let signed = signTaprootPSBT(signer, psbt, pubkey);
        let tx = signed.extractTransaction();
        console.table({
            txid: tx.getId(),
            fee: psbt.getFee(),
            feeRate: psbt.getFeeRate(),
        });
        const rawhex = tx.toHex();
        console.log(rawhex);
        let stone = RuneStone.fromTransaction(tx);
        console.log(stone);
        // let txid = await broadcast(rawhex, network);
        // console.log(txid);
    })

    it('test mint tokens', async () => {
        let utxos = await getUTXOs(address, network);
        console.table(utxos);
        // etching block height | etching transaction index
        let runeId = new RuneId(2582645, 839);
        const runeStone = new RuneStone(
            [{
                id: RuneId.toBigInt(runeId),
                amount: BigInt(1000),
                output: BigInt(1),
            } as any], // edicts
            null, // etching
            false, // is burning? true/false
            null, // claim
            null, // default output
        );
        runeStone.setTag('RUNE_TEST');
        const encipher = runeStone.encipher();
        const outputs = [
            {
                script: encipher,
                value: 0,
            },
            {
                script: output,
                value: 10,
            }
        ];
        let amount = outputs.reduce((a, b) => a + b.value, 0);
        const {inputs, fee, change} = tryTaprootTxInputs(utxos, amount, feeRate, 0, outputs.length);
        console.table({amount, fee, change});
        if (change) {
            outputs.push({
                script: output,
                value: change
            });
        }
        console.table(inputs);
        console.table(outputs);
        let psbt = toTaprootPSBT(inputs, outputs, output, pubkey, network);
        let signed = signTaprootPSBT(signer, psbt, pubkey);
        let tx = signed.extractTransaction();
        console.table({
            txid: tx.getId(),
            fee: psbt.getFee(),
            feeRate: psbt.getFeeRate(),
        });
        const rawhex = tx.toHex();
        console.log(rawhex);
        let stone = RuneStone.fromTransaction(tx);
        console.log(stone);
        // let txid = await broadcast(rawhex, network);
        // console.log(txid);
    })
    it('test transfer tokens', async () => {
        let utxos = await getUTXOs(address, network);
        console.table(utxos);
        // balance location: txid:vout
        const location = ':1';
        let input = utxos.find((e) => e.txid + ':' + e.vout === location)!;
        // etching block height | etching transaction index
        let runeId = new RuneId(2582645, 839);
        const runeStone = new RuneStone(
            [{
                id: RuneId.toBigInt(runeId),
                amount: BigInt(100),
                output: BigInt(1),
            } as any], // edicts
            null, // etching
            false, // is burning? true/false
            null, // claim
            null, // default output
        );
        runeStone.setTag('RUNE_TEST');
        const encipher = runeStone.encipher();
        const outputs = [
            {
                script: encipher,
                value: 0,
            },
            {
                script: output,
                value: 1,
            }, {
                script: output,
                value: input.value,
            }
        ];
        let amount = outputs.reduce((a, b) => a + b.value, 0) - input.value;
        const {inputs, fee, change} = tryTaprootTxInputs(utxos, amount, feeRate, 1, outputs.length);
        console.table({amount, fee, change});
        if (change) {
            outputs.push({
                script: output,
                value: change
            });
        }
        let finalInputs = [input, ...inputs];
        console.table(finalInputs);
        console.table(outputs);
        let psbt = toTaprootPSBT(finalInputs, outputs, output, pubkey, network);
        let signed = signTaprootPSBT(signer, psbt, pubkey);
        let tx = signed.extractTransaction();
        console.table({
            txid: tx.getId(),
            fee: psbt.getFee(),
            feeRate: psbt.getFeeRate(),
        });
        const rawhex = tx.toHex();
        console.log(rawhex);
        let stone = RuneStone.fromTransaction(tx);
        console.log(stone);
        // let txid = await broadcast(rawhex, network);
        // console.log(txid);
    })

    it('test burn tokens', async () => {
        let utxos = await getUTXOs(address, network);
        console.table(utxos);
        // balance location: txid:vout
        const location = ':1';
        let input = utxos.find((e) => e.txid + ':' + e.vout === location)!;
        const runeStone = new RuneStone(
            [], // edicts
            null, // etching
            true, // is burning? true/false
            null, // claim
            null, // default output
        );
        runeStone.setTag('RUNE_TEST');
        const encipher = runeStone.encipher();
        const outputs = [
            {
                script: encipher,
                value: 0,
            },
        ];
        let amount = outputs.reduce((a, b) => a + b.value, 0) - input!.value;
        const {inputs, fee, change} = tryTaprootTxInputs(utxos, amount, feeRate, 1, outputs.length);
        console.table({amount, fee, change});
        if (change) {
            outputs.push({
                script: output,
                value: change
            });
        }
        let finalInputs = [input, ...inputs];
        console.table(finalInputs);
        console.table(outputs);
        let psbt = toTaprootPSBT(finalInputs, outputs, output, pubkey, network);
        let signed = signTaprootPSBT(signer, psbt, pubkey);
        let tx = signed.extractTransaction();
        console.table({
            txid: tx.getId(),
            fee: psbt.getFee(),
            feeRate: psbt.getFeeRate(),
        });
        const rawhex = tx.toHex();
        console.log(rawhex);
        let stone = RuneStone.fromTransaction(tx);
        console.log(stone);
        // let txid = await broadcast(rawhex, network);
        // console.log(txid);
    })
});
