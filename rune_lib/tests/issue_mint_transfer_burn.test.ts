import {
  addressToOutputScript,
  AddressType,
  bitcoin,
  ECPair,
  getKeypairInfo,
  getTapscriptCommitment,
  logToJSON,
  prepareCommitRevealConfig,
  prepareTx,
  publicKeyToAddress,
  toPsbt,
  Wallet,
} from './bitcoin';
import { getUTXOs, pickUTXO } from './mempool';
import { Edict, Etching, Rune, RuneId, RuneStone } from '../src';
import { Terms } from '../src/terms';
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371';
import { Psbt } from 'bitcoinjs-lib';

describe('Issue/Mint/Transfer/Burn', () => {
  // replace with your own private key
  const wif = 'cSwthjF4FgBcrSEp5C1ufJbdd5TF49F1dyGqLE2NEGqVTffNENca';
  // replace with your own network
  const network = bitcoin.networks.testnet;
  // replace with your own fee rate
  const feeRate = 1;
  const signer = ECPair.fromWIF(wif, network);
  let pubkey = signer.publicKey;

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
    let rune = Rune.fromString('MASTERFX');
    const runeStone = new RuneStone({
      edicts: [], // edicts
      etching: new Etching({
        // like decimals.
        divisibility: 0,
        // the name of the token, if null, it will be automatically generated.
        rune,
        // this is not the name of the token, only one character is supported here
        symbol: '$',
        premine: BigInt(1000),
        terms: new Terms({
          cap: BigInt(999),
          amount: BigInt(1000),
        }),
      }), // etching
      cenotaph: false, // is burning? true/false
      mint: null,
      pointer: BigInt(1),
    });

    // compose tapscript

    const tapInternalKey = toXOnly(pubkey);

    const { scriptP2TR, hashLockP2TR, hashscript } = prepareCommitRevealConfig(
      tapInternalKey.toString('hex'),
      Buffer.from(runeStone.etching?.rune?.commitment()!).toString('hex'),
      network,
    );

    const commitAndRevealFee = 10000; // temporily value, should calfee

    const pickedUtxo = pickUTXO(utxos, commitAndRevealFee);

    if (pickedUtxo === undefined) {
      console.log('no utxos');
      return;
    } else {
      // compose commit tx

      let psbtCommit = new Psbt({ network: network });
      psbtCommit.setVersion(1);
      psbtCommit.addInput({
        hash: pickedUtxo.txid,
        index: pickedUtxo.vout,
        witnessUtxo: { value: pickedUtxo.value, script: output },
        tapInternalKey,
      });

      psbtCommit.addOutput({
        address: scriptP2TR.address!,
        value: commitAndRevealFee,
      });

      let commitWallet = new Wallet(wif, network, addressType);
      let signedCommitTx = commitWallet.signPsbt(psbtCommit);
      const commitTx = signedCommitTx.extractTransaction();
      const commitTxRawHex = commitTx.toHex();
      const commitTxId = commitTx.getId();

      console.table({
        commitTxId,
        commitTxRawHex,
      });

      // compose reveal TX

      const tapLeafScript = {
        leafVersion: hashLockP2TR!.redeem!.redeemVersion!,
        script: hashLockP2TR!.redeem!.output!,
        controlBlock: hashLockP2TR.witness![hashLockP2TR.witness!.length - 1],
      };

      let psbtReveal = new Psbt({ network });
      psbtReveal.setVersion(1);
      psbtReveal.addInput({
        hash: commitTxId,
        index: 0,
        witnessUtxo: { value: commitAndRevealFee, script: hashLockP2TR.output! },
        tapLeafScript: [tapLeafScript],
        sequence: 0xffffffff - 2,
      });

      const encipher = runeStone.encipher();
      const outputs = [
        {
          script: encipher,
          value: 0,
        },
        {
          // receiver
          script: output,
          value: 546,
        },
      ];

      const fundingKeypair = getKeypairInfo(signer, network);

      psbtReveal.signInput(0, fundingKeypair.childNode);
      psbtReveal.finalizeAllInputs();

      // let amount = outputs.reduce((a, b) => a + b.value, 0);
      // const txResult = prepareTx({
      //   regularUTXOs: utxos,
      //   inputs: [],
      //   outputs,
      //   feeRate,
      //   address,
      //   amount,
      // });
      // if (txResult.error) {
      //   console.error(txResult.error);
      //   return;
      // }
      // logToJSON(txResult.ok);
      // let psbt = toPsbt({ tx: txResult.ok!, pubkey, rbf: true });
      // let wallet = new Wallet(wif, network, addressType);
      // let signed = wallet.signPsbt(psbt);
      let revealTx = psbtReveal.extractTransaction();

      const revealTxRawHex = revealTx.toHex();
      console.table({
        revealTxId: revealTx.getId(),
        revealTxFee: psbtReveal.getFee(),
        revealTxFeeRate: psbtReveal.getFeeRate(),
        revealTxRawHex,
      });
      let stone = RuneStone.fromTransaction(revealTx);
      console.log(stone);
      // let txid = await broadcast(rawhex, network);
      // console.log(txid);
    }
  });

  it('test issue tokens(fairmint)', async () => {
    let utxos = await getUTXOs(address, network);
    console.table(utxos);
    let rune = Rune.fromString('MASTERFA');
    const runeStone = new RuneStone({
      etching: new Etching({
        // like decimals.
        divisibility: 2,
        // the name of the token, if null, it will be automatically generated.
        rune,
        // this is not the name of the token, only one character is supported here
        symbol: 'x',
        terms: new Terms({
          cap: BigInt(1e12),
          height: [null, BigInt(1e8)],
          amount: BigInt(1e5),
        }),
      }), // etching
      cenotaph: false, // is burning? true/false
      mint: null,
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
    let psbt = toPsbt({ tx: txResult.ok!, pubkey, rbf: true });
    let wallet = new Wallet(wif, network, addressType);
    let signed = wallet.signPsbt(psbt);
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
  });

  it('test mint tokens', async () => {
    let utxos = await getUTXOs(address, network);
    console.table(utxos);
    // etching block height | etching transaction index
    let runeId = new RuneId(BigInt(0), BigInt(0));
    const runeStone = new RuneStone({
      edicts: [new Edict({ id: runeId, amount: BigInt(1e5), output: BigInt(1) })],
      cenotaph: false,
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
    let psbt = toPsbt({ tx: txResult.ok!, pubkey, rbf: true });
    let wallet = new Wallet(wif, network, addressType);
    let signed = wallet.signPsbt(psbt);
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
  });
  it('test transfer tokens', async () => {
    let utxos = await getUTXOs(address, network);
    console.table(utxos);
    // balance location: txid:vout
    const location = ':1';
    let input = utxos.find(e => e.txid + ':' + e.vout === location)!;
    // etching block height | etching transaction index
    let runeId = new RuneId(BigInt(0), BigInt(0));
    const runeStone = new RuneStone({
      edicts: [
        new Edict({ id: runeId, amount: BigInt(1e5), output: BigInt(1) }),
        new Edict({ id: runeId, amount: BigInt(1e12 - 1e5), output: BigInt(2) }),
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
    let psbt = toPsbt({ tx: txResult.ok!, pubkey, rbf: true });
    let wallet = new Wallet(wif, network, addressType);
    let signed = wallet.signPsbt(psbt);
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
  });

  it('test burn tokens', async () => {
    let utxos = await getUTXOs(address, network);
    console.table(utxos);
    // balance location: txid:vout
    const location = ':1';
    let input = utxos.find(e => e.txid + ':' + e.vout === location)!;
    const runeStone = new RuneStone({
      cenotaph: true,
    });
    const encipher = runeStone.encipher();
    const outputs = [
      {
        script: encipher,
        value: 0,
      },
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
    let psbt = toPsbt({ tx: txResult.ok!, pubkey, rbf: true });
    let wallet = new Wallet(wif, network, addressType);
    let signed = wallet.signPsbt(psbt);
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
  });
});
