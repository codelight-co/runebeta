import { addressToOutputScript, AddressType, bitcoin, ECPair, logToJSON, prepareTx, publicKeyToAddress, toPsbt, Wallet } from './bitcoin';
import { getUTXOs } from './mempool';
import { Edict, Etching, Rune, RuneId, RuneStone } from '../src';
import { Terms } from '../src/terms';

describe('Issue/Mint/Transfer/Burn', () => {
  // replace with your own private key
  const wif = '';
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
