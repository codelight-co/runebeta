import {
    addressToOutputScript,
    AddressType,
    bitcoin,
    ECPair,
    getKeypairInfo,
    logToJSON,
    Output,
    prepareCommitAndRevealTx,
    prepareCommitRevealConfig,
    prepareTx,
    publicKeyToAddress,
    randomP2TRWallet,
    toPsbt,
    Wallet,
} from './bitcoin';
import {getUTXOs, UTXO} from './mempool';
import {Edict, Etching, RuneId, RuneStone} from '../src';
import {Terms} from '../src/terms';
import {toXOnly} from 'bitcoinjs-lib/src/psbt/bip371';
import {Psbt} from 'bitcoinjs-lib';
import {SpacedRune} from '../src/spaced_rune';

describe('Issue/Mint/Transfer/Burn', () => {
    // replace with your own private key
    const wif = '';
    // replace with your own network
    const network = bitcoin.networks.testnet;

    // replace with your own fee rate
    const feeRate = 1;
    const signer = ECPair.fromWIF(wif, network);
    let pubkey = signer.publicKey;

    let dustAmount = network === bitcoin.networks.testnet ? 546 : 546;

    let addressType = AddressType.P2TR;
    let address = publicKeyToAddress(pubkey, addressType, network)!;
    const output = addressToOutputScript(address);
    console.log({
        pubkey: pubkey.toString('hex'),
        address,
    });
    it('test issue tokens(fixedcap)', async () => {
        let utxos = await getUTXOs(address, network);
        console.table(utxos);
        // the name of the token
        let spRune = SpacedRune.fromString('HELLO•FIXED');
        const runeStone = new RuneStone({
            edicts: [], // edicts
            etching: new Etching({
                spacers: (spRune as SpacedRune).spacers,
                // like decimals.
                divisibility: 2,
                // the name of the token, if null, it will be automatically generated.
                rune: (spRune as SpacedRune).rune,
                // this is not the name of the token, only one character is supported here
                symbol: '^',
                premine: BigInt(1e10 * 1e2),
                // terms: new Terms({
                //     // cap = supply / divisibility
                //     cap: BigInt(1e10),
                //     amount: BigInt(1e10 * 1e2),
                // }),
            }), // etching
            mint: null,
            // receiver output index
            pointer: BigInt(1),
        });

        const encipher = runeStone.encipher();
        // const test = bitcoin.payments.embed({
        //     data: [Buffer.from(new Array(1e5).fill(10))],
        // }).output!;
        const revealOutputs = [
            {
                script: encipher,
                // script: test,
                value: 0,
            },
            {
                // receiver
                script: output,
                value: 1,
            },
        ];

        // compose tapscript
        let revealWallet = randomP2TRWallet(network);
        const tapInternalKey = toXOnly(revealWallet.pubkey);

        let payload = Buffer.from(runeStone.etching?.rune?.commitment()!);
        const {scriptP2TR, hashLockP2TR, hashscript} = prepareCommitRevealConfig(tapInternalKey, payload, network);

        let txResult = prepareCommitAndRevealTx({
            // safe btc utxos
            utxos,
            feeRate,
            network,
            // reveal input number, default is 1
            revealInputs: 1,
            // reveal outputs
            revealOutputs,
            payload,
        });

        console.table(txResult);

        const commitOutputs = [
            {
                address: scriptP2TR.address!,
                value: txResult.revealNeed,
            },
        ];

        if (txResult.change) {
            commitOutputs.push({
                address,
                value: txResult.change,
            });
        }

        let commitPsbt = toPsbt({
            tx: {
                inputs: txResult.inputs,
                outputs: commitOutputs,
                feeRate,
                address,
            },
            pubkey,
            rbf: true,
        });

        let commitWallet = new Wallet(wif, network, addressType);
        let signedCommitPsbt = commitWallet.signPsbt(commitPsbt);
        const commitTx = signedCommitPsbt.extractTransaction(true);
        const commitTxRawHex = commitTx.toHex();
        const commitTxId = commitTx.getId();

        // compose reveal TX
        const tapLeafScript = {
            leafVersion: hashLockP2TR!.redeem!.redeemVersion!,
            script: hashLockP2TR!.redeem!.output!,
            controlBlock: hashLockP2TR.witness![hashLockP2TR.witness!.length - 1],
        };

        let psbtReveal = new Psbt({network});
        psbtReveal.setVersion(1);
        psbtReveal.addInput({
            hash: commitTxId,
            index: 0,
            witnessUtxo: {value: txResult.revealNeed, script: hashLockP2TR.output!},
            tapLeafScript: [tapLeafScript],
            sequence: 0xffffffff - 2,
        });
        psbtReveal.addOutputs(revealOutputs);


        const fundingKeypair = getKeypairInfo(revealWallet.keyPair, network);

        psbtReveal.signInput(0, fundingKeypair.childNode);
        psbtReveal.finalizeAllInputs();
        let revealTx = psbtReveal.extractTransaction(true);
        const revealTxRawHex = revealTx.toHex();
        console.log({
            commitTxId,
            commitTxRawHex,
            commitTxFee: signedCommitPsbt.getFee(),
            commitTxFeeRate: signedCommitPsbt.getFeeRate(),
            revealTxId: revealTx.getId(),
            revealTxFee: psbtReveal.getFee(),
            revealTxFeeRate: psbtReveal.getFeeRate(),
            revealTxRawHex,
        });
        let stone = RuneStone.fromTransaction(revealTx);
        console.log(stone);
        // let txid = await broadcast(rawhex, network);
        // console.log(txid);
    });

    it('test issue tokens(fairmint)', async () => {
        let utxos = await getUTXOs(address, network);
        console.table(utxos);
        // the name of the token
        let spRune = SpacedRune.fromString('HELLO•WORLD•FAIR');
        const runeStone = new RuneStone({
            edicts: [], // edicts
            etching: new Etching({
                spacers: (spRune as SpacedRune).spacers,
                // like decimals.
                divisibility: 2,
                // the name of the token, if null, it will be automatically generated.
                rune: (spRune as SpacedRune).rune,
                // this is not the name of the token, only one character is supported here
                symbol: 'f',
                // premine
                premine: BigInt(1e5),
                terms: new Terms({
                    // cap = supply / 10^divisibility
                    // supply = cap * 10^divisibility
                    cap: BigInt(1e10),
                    amount: BigInt(1e5),
                }),
            }), // etching
            mint: null,
            // receiver output index
            pointer: BigInt(1),
        });

        const encipher = runeStone.encipher();
        const revealOutputs = [
            {
                script: encipher,
                value: 0,
            },
            {
                // receiver
                script: output,
                value: 1,
            },
        ];

        // compose tapscript
        let revealWallet = randomP2TRWallet(network);
        const tapInternalKey = toXOnly(revealWallet.pubkey);

        let payload = Buffer.from(runeStone.etching?.rune?.commitment()!);
        const {scriptP2TR, hashLockP2TR, hashscript} = prepareCommitRevealConfig(tapInternalKey, payload, network);

        let txResult = prepareCommitAndRevealTx({
            // safe btc utxos
            utxos,
            feeRate,
            network,
            // reveal input number, default is 1
            revealInputs: 1,
            // reveal outputs
            revealOutputs,
            payload,
        });

        console.table(txResult);

        const commitOutputs = [
            {
                address: scriptP2TR.address!,
                value: txResult.revealNeed,
            },
        ];

        if (txResult.change) {
            commitOutputs.push({
                address,
                value: txResult.change,
            });
        }

        let commitPsbt = toPsbt({
            tx: {
                inputs: txResult.inputs,
                outputs: commitOutputs,
                feeRate,
                address,
            },
            pubkey,
            rbf: true,
        });

        let commitWallet = new Wallet(wif, network, addressType);
        let signedCommitPsbt = commitWallet.signPsbt(commitPsbt);
        const commitTx = signedCommitPsbt.extractTransaction(true);
        const commitTxRawHex = commitTx.toHex();
        const commitTxId = commitTx.getId();

        // compose reveal TX
        const tapLeafScript = {
            leafVersion: hashLockP2TR!.redeem!.redeemVersion!,
            script: hashLockP2TR!.redeem!.output!,
            controlBlock: hashLockP2TR.witness![hashLockP2TR.witness!.length - 1],
        };

        let psbtReveal = new Psbt({network});
        psbtReveal.setVersion(1);
        psbtReveal.addInput({
            hash: commitTxId,
            index: 0,
            witnessUtxo: {value: txResult.revealNeed, script: hashLockP2TR.output!},
            tapLeafScript: [tapLeafScript],
            sequence: 0xffffffff - 2,
        });
        psbtReveal.addOutputs(revealOutputs);

        const fundingKeypair = getKeypairInfo(revealWallet.keyPair, network);

        psbtReveal.signInput(0, fundingKeypair.childNode);
        psbtReveal.finalizeAllInputs();
        let revealTx = psbtReveal.extractTransaction(true);
        const revealTxRawHex = revealTx.toHex();
        console.log({
            commitTxId,
            commitTxRawHex,
            commitTxFee: signedCommitPsbt.getFee(),
            commitTxFeeRate: signedCommitPsbt.getFeeRate(),
            revealTxId: revealTx.getId(),
            revealTxFee: psbtReveal.getFee(),
            revealTxFeeRate: psbtReveal.getFeeRate(),
            revealTxRawHex,
        });
        let stone = RuneStone.fromTransaction(revealTx);
        console.log(stone);
        // let txid = await broadcast(rawhex, network);
        // console.log(txid);
    });

    it('test mint tokens', async () => {
        let utxos = await getUTXOs(address, network);
        console.table(utxos);
        // etching block height | etching transaction index
        let runeId = new RuneId(BigInt(2584592), BigInt(58));
        const runeStone = new RuneStone({
            edicts: [new Edict({id: runeId, amount: BigInt(1e5), output: BigInt(1)})],
            mint: runeId,
            pointer: BigInt(1),
        });
        const encipher = runeStone.encipher();
        const outputs = [
            {
                script: encipher,
                value: 0,
            },
            {
                script: output,
                value: 1,
            },
        ];
        let amount = outputs.reduce((a, b) => a + b.value, 0);
        const txResult = prepareTx({
            regularUTXOs: utxos,
            inputs: [],
            outputs,
            feeRate,
            address,
            amount,
        });
        if (txResult.error) {
            console.error(txResult.error);
            return;
        }
        logToJSON(txResult.ok);
        let psbt = toPsbt({tx: txResult.ok!, pubkey, rbf: true});
        let wallet = new Wallet(wif, network, addressType);
        let signed = wallet.signPsbt(psbt);
        let tx = signed.extractTransaction(true);
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
    });
    it('test transfer tokens', async () => {
        let utxos = await getUTXOs(address, network);
        console.table(utxos);
        // balance location: txid:vout
        const location = ':1';
        let input = utxos.find(e => e.txid + ':' + e.vout === location)!;
        // etching block height | etching transaction index
        let runeId = new RuneId(BigInt(2584592), BigInt(58));
        const runeStone = new RuneStone({
            edicts: [
                new Edict({id: runeId, amount: BigInt(1e5), output: BigInt(1)}),
                new Edict({id: runeId, amount: BigInt(10000000000 - 1e5), output: BigInt(2)}),
            ],
        });
        const encipher = runeStone.encipher();
        const outputs = [
            {
                script: encipher,
                value: 0,
            },
            {
                script: output,
                value: 1,
            },
            {
                script: output,
                value: input.value,
            },
        ];
        let amount = outputs.reduce((a, b) => a + b.value, 0) - input.value;
        const txResult = prepareTx({
            regularUTXOs: utxos,
            inputs: [input],
            outputs,
            feeRate,
            address,
            amount,
        });
        if (txResult.error) {
            console.error(txResult.error);
            return;
        }
        logToJSON(txResult.ok);
        let psbt = toPsbt({tx: txResult.ok!, pubkey, rbf: true});
        let wallet = new Wallet(wif, network, addressType);
        let signed = wallet.signPsbt(psbt);
        let tx = signed.extractTransaction(true);
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
    });

    it('test burn tokens', async () => {
        let utxos = await getUTXOs(address, network);
        console.table(utxos);
        // balance location: txid:vout
        const location = ':1';
        let input = utxos.find(e => e.txid + ':' + e.vout === location)!;
        let runeId = new RuneId(BigInt(2584592), BigInt(58));
        const runeStone = new RuneStone({
            edicts: [
                // burn 1e5 tokens
                new Edict({
                    id: runeId,
                    amount: BigInt(1e5),
                    // to op_return output index
                    output: BigInt(0),
                }),
                // remaining tokens
                new Edict({
                    id: runeId,
                    amount: BigInt(10000000000 - 1e5),
                    output: BigInt(1),
                }),
            ]
        });
        const encipher = runeStone.encipher();
        const outputs = [
            {
                script: encipher,
                value: 0,
            },
            {
                script: output,
                value: input.value
            }
        ];
        let amount = outputs.reduce((a, b) => a + b.value, 0) - input!.value;
        const txResult = prepareTx({
            regularUTXOs: utxos,
            inputs: [input],
            outputs,
            feeRate,
            address,
            amount,
        });
        if (txResult.error) {
            console.error(txResult.error);
            return;
        }
        logToJSON(txResult.ok);
        let psbt = toPsbt({tx: txResult.ok!, pubkey, rbf: true});
        let wallet = new Wallet(wif, network, addressType);
        let signed = wallet.signPsbt(psbt);
        let tx = signed.extractTransaction(true);
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
    });
    it('test merge tokens', async () => {
        let resp = await fetch(`https://apis.supersats.xyz/testnet/runes/utxo/${address}`).then((res) => res.json());
        if (Array.isArray(resp.data)) {
            let runeUTXOs = resp.data.map(e => e.utxo).map(e => ({
                txid: e.tx_hash,
                vout: Number(e.vout),
                value: Number(e.value)
            }));
            let runeOutputs = new Set<string>();
            for (let runeUTXO of runeUTXOs) {
                runeOutputs.add(runeUTXO.txid + ':' + runeUTXO.vout);
            }
            let allUtxos = await getUTXOs(address, network);
            let safeUTXOs = allUtxos.filter(e => !runeOutputs.has(e.txid + ':' + e.vout));
            let willMerged = runeUTXOs.slice(0, 3);
            console.table(willMerged);
            const txResult = prepareTx({
                regularUTXOs: safeUTXOs,
                inputs: willMerged,
                outputs: [{
                    script: output,
                    value: willMerged.reduce((a, b) => a + b.value, 0),
                }],
                feeRate,
                address,
                amount: 0,
            });
            if (txResult.error) {
                console.error(txResult.error);
                return;
            }
            logToJSON(txResult.ok);
            let psbt = toPsbt({tx: txResult.ok!, pubkey, rbf: true});
            let wallet = new Wallet(wif, network, addressType);
            let signed = wallet.signPsbt(psbt);
            let tx = signed.extractTransaction(true);
            console.table({
                txid: tx.getId(),
                fee: psbt.getFee(),
                feeRate: psbt.getFeeRate(),
            });
            const rawhex = tx.toHex();
            console.log(rawhex);
        }
    });
    it('test split tokens', async () => {
        let url = `https://apis.supersats.xyz/testnet/runes/utxo/${address}`;
        console.log(url);
        let resp = await fetch(url).then((res) => res.json());
        let runes = resp.data;
        if (Array.isArray(runes)) {
            const map = new Map<string, { runeValue: bigint; runeId: string; }[]>();
            for (const item of runes) {
                const key = item.utxo.tx_hash + ':' + item.utxo.vout + ':' + item.utxo.value;
                if (!map.has(key)) {
                    map.set(key, []);
                }
                map.get(key)!.push({
                    runeValue: BigInt(item.amount),
                    runeId: item.rune_id
                });
            }
            let entries = Array.from(map.entries()).filter((e) => e[1].length > 1);
            console.log(entries);
            if (entries.length) {
                let [key, values] = entries[0];
                let allUTXOs = await getUTXOs(address, network);
                let safeUTXOs = allUTXOs.filter(e => e.txid + ':' + e.vout + ':' + e.value !== key);
                let outputs: Output[] = [];
                let edicts: Edict[] = [];
                for (let i = 0; i < values.length; i++) {
                    let item = values[i];
                    outputs.push({
                        script: output,
                        value: dustAmount,
                    });
                    let strings = item.runeId.split(':');
                    edicts.push(new Edict({
                        id: new RuneId(BigInt(strings[0]), BigInt(strings[1])),
                        amount: item.runeValue,
                        output: BigInt(i),
                    }));
                }
                outputs.push({
                    script: new RuneStone({
                        edicts
                    }).encipher(),
                    value: 0,
                });
                let compressedUTXO = key.split(':');
                let input = {
                    txid: compressedUTXO[0],
                    vout: Number(compressedUTXO[1]),
                    value: Number(compressedUTXO[2])
                };
                let amount = outputs.reduce((a, b) => a + b.value, 0) - input.value;
                const txResult = prepareTx({
                    regularUTXOs: safeUTXOs,
                    inputs: [input],
                    outputs,
                    feeRate,
                    address,
                    amount,
                });
                if (txResult.error) {
                    console.error(txResult.error);
                    return;
                }
                logToJSON(txResult.ok);
                let psbt = toPsbt({tx: txResult.ok!, pubkey, rbf: true});
                let wallet = new Wallet(wif, network, addressType);
                let signed = wallet.signPsbt(psbt);
                let tx = signed.extractTransaction(true);
                console.table({
                    txid: tx.getId(),
                    fee: psbt.getFee(),
                    feeRate: psbt.getFeeRate(),
                });
                const rawhex = tx.toHex();
                console.log(rawhex);
            }
        }
    });


    function buildTransfer({rune, receivers, regularUTXOs, feeRate, address}: {
        rune: RuneBalanceItemWithUTXOs, receivers: {
            runeAmount: bigint;
            receiver: string;
        }[], regularUTXOs: UTXO[], feeRate: number, address: string
    }) {
        let spent = receivers.reduce((a, b) => a + b.runeAmount, BigInt(0));
        let remaining = rune.runeValue - spent;
        if (remaining < BigInt(0)) {
            throw new Error(`Insufficient ${rune.rune} funds`);
        }

        let inputRuneValue = BigInt(0);
        let inputValue = 0;
        let inputs: UTXO[] = [];
        let remainingRuneValue = BigInt(0);
        let ok = false;
        for (let utxo of rune.utxos) {
            inputRuneValue += utxo.runeValue;
            inputValue += utxo.value;
            inputs.push({
                txid: utxo.txid,
                vout: utxo.vout,
                value: utxo.value,
            });
            remainingRuneValue = inputRuneValue - spent;
            if (remainingRuneValue >= BigInt(0)) {
                ok = true;
                break;
            }
        }

        if (!ok) {
            // unreachable
            throw new Error(`Insufficient ${rune.rune} funds`);
        }

        let outputs: Output[] = [];
        let edicts: Edict[] = [];
        let splitRuneId = rune.runeId.split(':');
        let runeId = new RuneId(BigInt(splitRuneId[0]), BigInt(splitRuneId[1]));
        let outputValue = 0;
        for (let i = 0; i < receivers.length; i++) {
            let item = receivers[i];
            outputs.push({
                script: addressToOutputScript(item.receiver),
                value: dustAmount,
            });
            outputValue += dustAmount;
            edicts.push(new Edict({
                id: runeId,
                amount: item.runeAmount,
                output: BigInt(i),
            }));
        }
        if (remainingRuneValue > BigInt(0)) {
            outputs.push({
                script: addressToOutputScript(address),
                value: dustAmount,
            })
            outputValue += dustAmount;
            edicts.push(new Edict({
                id: runeId,
                amount: remaining,
                output: BigInt(receivers.length),
            }));
        }
        let script = new RuneStone({
            edicts
        }).encipher();
        if (script.length > 83) {
            throw new Error("Please reduce the number of receivers");
        }
        outputs.push({
            script: script,
            value: 0,
        });
        let amount = outputValue - inputValue;
        let txResult = prepareTx({
            inputs,
            outputs,
            regularUTXOs,
            feeRate,
            address,
            amount
        });
        if (txResult.error) {
            throw new Error(txResult.error);
        }
        logToJSON(txResult.ok);
        return txResult.ok!;
    }

    it('test batch send tokens', async () => {
        let allUTXOs = await getUTXOs(address, network);
        let allUTXOsMap = new Map<string, UTXO>();
        for (let utxo of allUTXOs) {
            allUTXOsMap.set(utxo.txid + ':' + utxo.vout, utxo);
        }
        let url = `https://apis.supersats.xyz/testnet/runes/utxo/${address}`;
        console.log(url);
        let resp = await fetch(url).then((res) => res.json());
        let runes = resp.data;
        if (Array.isArray(runes)) {
            const map = new Map<string, RuneBalanceItemWithUTXOs>();
            for (const item of runes) {
                const key = item.rune_id;
                if (!map.has(key)) {
                    map.set(key, {
                        divisibility: item.rune.divisibility,
                        rune: item.rune.rune,
                        runeId: key,
                        symbol: item.rune.symbol,
                        utxos: [],
                        runeValue: BigInt(0),
                    });
                }
                const runeValue = BigInt(item.amount);
                const vout = Number(item.utxo.vout);
                map.get(key)!.utxos.push({
                    txid: item.utxo.tx_hash,
                    vout: vout,
                    index: vout,
                    value: Number(item.utxo.value),
                    runeValue,
                } as any);
                map.get(key)!.runeValue += runeValue;
                allUTXOsMap.delete(item.utxo.tx_hash + ':' + item.utxo.vout);
            }

            console.log(map);
            // pick a rune balance
            let rune = map.get("2584592:58")!;
            console.log(rune)
            let ptx = buildTransfer({
                rune,
                receivers: [
                    {
                        // transfer 1e5 rune value
                        runeAmount: BigInt(123456789),
                        // receiver address
                        receiver: address
                    },
                    {
                        // transfer 1e5 rune value
                        runeAmount: BigInt(98765432100),
                        // receiver address
                        receiver: address
                    }
                ],
                regularUTXOs: Array.from(allUTXOsMap.values()),
                feeRate,
                address,
            });
            let psbt = toPsbt({tx: ptx, pubkey, rbf: true});
            let wallet = new Wallet(wif, network, addressType);
            let signed = wallet.signPsbt(psbt);
            let tx = signed.extractTransaction(true);
            console.table({
                txid: tx.getId(),
                fee: psbt.getFee(),
                feeRate: psbt.getFeeRate(),
            });
            const rawhex = tx.toHex();
            console.log(rawhex);
        }
    });

    function prepareBatchRunesTx(
        runesBalances: Map<string, RuneBalanceItemWithUTXOs>,
        regularUTXOs: UTXO[],
        receivers: {
            runeId: string;
            runeAmount: bigint;
            receiver: string;
        }[]) {
        const runesSpent = new Map<string, bigint>();
        const outputs: Output[] = [];
        const edicts: Edict[] = [];
        for (let i = 0; i < receivers.length; i++) {
            let receiver = receivers[i];
            let receiverOutput: Buffer;
            try {
                receiverOutput = addressToOutputScript(receiver.receiver);
            } catch (e) {
                throw new Error(`Invalid address: ${receiver.receiver}`);
            }
            if (!runesSpent.has(receiver.runeId)) {
                runesSpent.set(receiver.runeId, BigInt(0));
            }
            runesSpent.set(receiver.runeId, runesSpent.get(receiver.runeId)! + BigInt(receiver.runeAmount));
            outputs.push({
                script: receiverOutput,
                value: dustAmount,
            });
            let strings = receiver.runeId.split(':');
            edicts.push(new Edict({
                id: new RuneId(BigInt(strings[0]), BigInt(strings[1])),
                amount: BigInt(receiver.runeAmount),
                output: BigInt(i),
            }));
        }
        let inputs: UTXO[] = [];
        for (let [runeId, spentAmount] of Array.from(runesSpent.entries())) {
            if (!runesBalances.has(runeId)) {
                throw new Error(`Insufficient ${runeId} funds`);
            }
            let rune = runesBalances.get(runeId)!;
            if (spentAmount > rune.runeValue) {
                throw new Error(`Insufficient ${rune.rune} funds`);
            }
            let inputRuneValue = BigInt(0);
            let remainingRuneValue = BigInt(0);
            let ok = false;
            for (let utxo of rune.utxos) {
                inputRuneValue += utxo.runeValue;
                if (inputRuneValue >= spentAmount) {
                    remainingRuneValue = inputRuneValue - spentAmount;
                    inputs.push(utxo);
                    ok = true;
                    break;
                }
            }
            if (!ok) {
                // unreachable, double check
                throw new Error(`Insufficient ${rune.rune} funds`);
            }
            console.log({
                inputRuneValue,
                spentAmount,
                remainingRuneValue,
            })
            if (remainingRuneValue > BigInt(0)) {
                // rune value remaining
                outputs.push({
                    script: addressToOutputScript(address),
                    value: dustAmount,
                });
                let splitRuneId = runeId.split(':');
                edicts.push(new Edict({
                    id: new RuneId(BigInt(splitRuneId[0]), BigInt(splitRuneId[1])),
                    amount: remainingRuneValue,
                    output: BigInt(outputs.length - 1),
                }));
            }
        }
        console.log(edicts);
        let script = new RuneStone({
            edicts
        }).encipher();
        if (script.length > 83) {
            throw new Error("Please reduce the number of receivers");
        }
        outputs.push({
            script: script,
            value: 0,
        });
        let amount = outputs.reduce((a, b) => a + b.value, 0) - inputs.reduce((a, b) => a + b.value, 0);
        let txResult = prepareTx({
            inputs,
            outputs,
            regularUTXOs,
            feeRate,
            address,
            amount
        });
        if (txResult.error) {
            throw new Error(txResult.error);
        }
        logToJSON(txResult.ok);
        return txResult.ok!;
    }

    it('test batch send multiple runes', async () => {
        let allUTXOs = await getUTXOs(address, network);
        let allUTXOsMap = new Map<string, UTXO>();
        for (let utxo of allUTXOs) {
            allUTXOsMap.set(utxo.txid + ':' + utxo.vout, utxo);
        }
        let url = `https://apis.supersats.xyz/testnet/runes/utxo/${address}`;
        console.log(url);
        let resp = await fetch(url).then((res) => res.json());
        let runes = resp.data;
        if (Array.isArray(runes)) {
            const balances = new Map<string, RuneBalanceItemWithUTXOs>();
            for (const item of runes) {
                const key = item.rune_id;
                if (!balances.has(key)) {
                    balances.set(key, {
                        divisibility: item.rune.divisibility,
                        rune: item.rune.rune,
                        runeId: key,
                        symbol: item.rune.symbol,
                        utxos: [],
                        runeValue: BigInt(0),
                    });
                }
                const runeValue = BigInt(item.amount);
                const vout = Number(item.utxo.vout);
                balances.get(key)!.utxos.push({
                    txid: item.utxo.tx_hash,
                    vout: vout,
                    index: vout,
                    value: Number(item.utxo.value),
                    runeValue,
                } as any);
                balances.get(key)!.runeValue += runeValue;
                allUTXOsMap.delete(item.utxo.tx_hash + ':' + item.utxo.vout);
            }

            console.log(balances);

            let prepareTx = prepareBatchRunesTx(balances, Array.from(allUTXOsMap.values()), [
                {
                    // transfer 1e5 rune value
                    runeAmount: BigInt(456789000),
                    // receiver address
                    receiver: address,
                    runeId: "2587804:2477"
                },
                {
                    // transfer 1e5 rune value
                    runeAmount: BigInt(12345),
                    // receiver address
                    receiver: address,
                    runeId: "2584503:2",
                }
            ]);
            let psbt = toPsbt({tx: prepareTx, pubkey, rbf: true});
            let wallet = new Wallet(wif, network, addressType);
            let signed = wallet.signPsbt(psbt);
            let tx = signed.extractTransaction(true);
            console.table({
                txid: tx.getId(),
                fee: psbt.getFee(),
                feeRate: psbt.getFeeRate(),
            });
            const rawhex = tx.toHex();
            console.log(rawhex);

        }
    });
});

export type RuneUTXO = UTXO & {
    runeValue: bigint;
};

export type RuneItem = {
    symbol: string;
    divisibility: number;
    runeId: string;
    rune: string;
};

export type RuneBalanceItem = RuneItem & {
    runeValue: bigint;
};

export type RuneBalanceItemWithUTXOs = RuneBalanceItem & {
    utxos: RuneUTXO[];
};