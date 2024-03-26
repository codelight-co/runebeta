import { Edict } from './edict';
import { Etching } from './etching';
import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
import * as varint from './varint';
import { MAGIC_NUMBER, MAX_DIVISIBILITY, MAX_SPACERS, Rune } from './rune';
import assert from 'assert';
import { Flag, FlagTypes } from './flag';
import { tagEncoder } from './tag';
import { Mint } from './mint';
import { RuneId } from './rune_id';

const TAG_BODY: bigint = BigInt(0);
const TAG_DIVISIBILITY: bigint = BigInt(1);
const TAG_FLAGS: bigint = BigInt(2);
const TAG_SPACERS: bigint = BigInt(3);
const TAG_RUNE: bigint = BigInt(4);
const TAG_SYMBOL: bigint = BigInt(5);
const TAG_LIMIT: bigint = BigInt(6);
const TAG_TERM: bigint = BigInt(8);
const TAG_DEADLINE: bigint = BigInt(10);
const TAG_DEFAULT_OUTPUT: bigint = BigInt(12);
const TAG_CLAIM: bigint = BigInt(14);
const TAG_CAP: bigint = BigInt(16);
const TAG_PREMINE: bigint = BigInt(18);
const TAG_CENOTAPH: bigint = BigInt(126);
const TAG_BURN: bigint = BigInt(126);
const TAG_NOP: bigint = BigInt(127);

const U128_MAX = BigInt(2) ** BigInt(128) - BigInt(1);

function addU128(a: bigint, b: bigint) {
  let result = a + b;
  if (result > U128_MAX) {
    throw new Error('Overflow error');
  }
  return result;
}

function mulU128(a: bigint, b: bigint) {
  let result = a * b;
  if (result > U128_MAX) {
    throw new Error('Overflow error');
  }
  return result;
}

// pub struct Runestone {
//     pub edicts: Vec<Edict>,
//     pub etching: Option<Etching>,
//     pub cenotaph: bool,
//   }

export class RuneStone {
  constructor(
    public edicts: Edict[],
    public etching: Etching | null,
    public cenotaph: boolean,
    public claim: bigint | null,
    public defaultOutput: bigint | null,
  ) {}

  static fromTransaction(transaction: Transaction): RuneStone | null {
    const rune = new RuneStone([], null, false, null, null);
    const runestone = rune.decipher(transaction);
    if (!runestone) {
      return null;
    }
    return runestone;
  }

  public encipher(): Buffer {
    let payload: number[] = [];

    if (this.etching) {
      let flags = BigInt(0);
      flags = new Flag(FlagTypes.Etch).set(flags);

      if (this.etching.mint !== null) {
        flags = new Flag(FlagTypes.Mint).set(flags);
      }

      payload = tagEncoder(TAG_FLAGS, flags, payload);

      if (this.etching.rune !== null) {
        payload = tagEncoder(TAG_RUNE, this.etching.rune.id, payload);
      }

      if (this.etching.divisibility !== 0 && this.etching.divisibility <= MAX_DIVISIBILITY) {
        payload = tagEncoder(TAG_DIVISIBILITY, BigInt(this.etching.divisibility), payload);
      }

      if (this.etching.spacers !== BigInt(0)) {
        payload = tagEncoder(TAG_SPACERS, BigInt(this.etching.spacers), payload);
      }

      if (this.etching.symbol !== null) {
        payload = tagEncoder(TAG_SYMBOL, BigInt(this.etching.symbol.charCodeAt(0)), payload);
      }

      if (this.etching.premine !== null) {
        payload = tagEncoder(TAG_SYMBOL, this.etching.premine, payload);
      }

      if (this.etching.mint !== null) {
        if (this.etching.mint.deadline !== null) {
          payload = tagEncoder(TAG_DEADLINE, this.etching.mint.deadline, payload);
        }
        if (this.etching.mint.limit !== null) {
          payload = tagEncoder(TAG_LIMIT, this.etching.mint.limit, payload);
        }
        if (this.etching.mint.term !== null) {
          payload = tagEncoder(TAG_TERM, this.etching.mint.term, payload);
        }
        if (this.etching.mint.cap !== null) {
          payload = tagEncoder(TAG_CAP, this.etching.mint.cap, payload);
        }
      }
    }

    if (this.claim) {
      payload = tagEncoder(TAG_CLAIM, this.claim, payload);
    }

    if (this.defaultOutput) {
      payload = tagEncoder(TAG_DEFAULT_OUTPUT, this.defaultOutput, payload);
    }
    if (this.cenotaph) {
      payload = tagEncoder(TAG_CENOTAPH, BigInt(0), payload);
    }

    if (this.edicts.length > 0) {
      payload = varint.encodeToVec(TAG_BODY, payload);

      const edicts = this.edicts.slice();
      edicts.sort((a, b) => (a.id < b.id ? -1 : 1));

      let previous = new RuneId(BigInt(0), BigInt(0));

      for (const edict of edicts) {
        let d = previous.delta(edict.id);
        let block = d![0];
        let tx = d![1];
        payload = varint.encodeToVec(block, payload);
        payload = varint.encodeToVec(tx, payload);
        payload = varint.encodeToVec(edict.amount, payload);
        payload = varint.encodeToVec(edict.output, payload);
        previous = edict.id;
      }
    }

    let buffers = chunkBuffer(Buffer.from(new Uint8Array(payload)), 520);

    let script = bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, bitcoin.opcodes.OP_PUSHNUM_13, ...buffers]);

    return script;
  }

  public decipher(transaction: bitcoin.Transaction): RuneStone | null {
    const payload = this.payload(transaction);
    if (!payload) {
      return null;
    }

    let integers: bigint[] = [];
    let i = 0;

    while (i < payload.length) {
      const _payload = payload.subarray(i);
      const [integer, length] = varint.decode(_payload);
      integers.push(integer);
      i += length;
    }

    const message = Message.fromIntegers(transaction, integers);

    let fields = message.fields;

    let cenotaph = message.cenotaph;
    let etching: Etching | null | undefined = null;

    let claim = fields.has(TAG_CLAIM) ? fields.get(TAG_CLAIM) : null;
    fields.delete(TAG_CLAIM);

    let deadline = fields.has(TAG_DEADLINE) ? fields.get(TAG_DEADLINE) : null;
    fields.delete(TAG_DEADLINE);

    let defaultOutput = fields.has(TAG_DEFAULT_OUTPUT) ? fields.get(TAG_DEFAULT_OUTPUT) : null;
    fields.delete(TAG_DEFAULT_OUTPUT);

    let divisibility = fields.has(TAG_DIVISIBILITY)
      ? Number(fields.get(TAG_DIVISIBILITY)! < BigInt(MAX_DIVISIBILITY) ? fields.get(TAG_DIVISIBILITY) : 0)
      : 0;
    fields.delete(TAG_DIVISIBILITY);

    let limit = fields.get(TAG_LIMIT);
    fields.delete(TAG_LIMIT);

    let rune = fields.get(TAG_RUNE);

    let cap = fields.has(TAG_CAP) ? fields.get(TAG_CAP) : null;

    fields.delete(TAG_CAP);

    let premine = fields.has(TAG_PREMINE) ? fields.get(TAG_PREMINE) : null;
    fields.delete(TAG_PREMINE);

    let spacers = fields.has(TAG_SPACERS) ? Number(fields.get(TAG_SPACERS)! < BigInt(MAX_SPACERS) ? fields.get(TAG_SPACERS) : 0) : 0;
    fields.delete(TAG_SPACERS);

    let symbol = fields.has(TAG_SYMBOL) ? charFromU32(Number(fields.get(TAG_SYMBOL))) : null;
    fields.delete(TAG_SYMBOL);

    let term = fields.has(TAG_TERM) ? (fields.get(TAG_TERM)! < BigInt(2) ** BigInt(32) - BigInt(1) ? Number(fields.get(TAG_TERM)) : null) : null;
    fields.delete(TAG_TERM);

    let etch, mint;
    let flags;
    if (fields.has(TAG_FLAGS)) {
      flags = fields.get(TAG_FLAGS);
      if (flags) {
        let _etch = new Flag(FlagTypes.Etch).take(flags);
        etch = _etch[0];
        flags = _etch[1];

        let _mint = new Flag(FlagTypes.Mint).take(flags);
        mint = _mint[0];
        flags = _mint[1];
      }
      fields.delete(TAG_FLAGS);
    }

    if (etch) {
      etching = new Etching(
        divisibility,
        mint ? new Mint(cap ?? null, deadline ?? null, limit ?? null, term !== null ? BigInt(term) : null) : null,
        rune ? new Rune(rune) : null,
        symbol,
        BigInt(spacers),
      );
    }

    let premineValue = BigInt(premine || 0); // 使用适当的默认值
    let capValue = BigInt(cap || 0);
    let limitValue = BigInt(limit || 0);

    let overflow = false;

    try {
      // 尝试执行操作
      addU128(premineValue, mulU128(capValue, limitValue));
      // 如果这里没有抛出错误，意味着没有溢出
    } catch (e) {
      // 如果捕获到错误，说明发生了溢出
      overflow = true;
    }

    // if (fields.has(TAG_RUNE)) {
    //   const rune = fields.get(TAG_RUNE);
    //   etching = new Etching(
    //     fields.has(TAG_DIVISIBILITY) ? Number(fields.get(TAG_DIVISIBILITY)! < BigInt(MAX_DIVISIBILITY) ? fields.get(TAG_DIVISIBILITY) : 0) : 0,
    //     fields.has(TAG_LIMIT) ? fields.get(TAG_LIMIT)! : null,
    //     rune ? new Rune(rune) : new Rune(BigInt(0)),
    //     fields.has(TAG_SYMBOL) ? charFromU32(Number(fields.get(TAG_SYMBOL))) : null,
    //     fields.has(TAG_TERM) ? (fields.get(TAG_TERM)! < BigInt(2) ** BigInt(32) - BigInt(1) ? Number(fields.get(TAG_TERM)) : null) : null,
    //   );
    // }

    // console.log({ overflow, cenotaph, flags });

    return new RuneStone(
      message.edicts,
      etching,
      overflow ||
        cenotaph ||
        (flags !== undefined && flags !== BigInt(0)) ||
        Array.from(fields.keys()).some(tag => Number.parseInt(tag.toString()) % 2 === 0),
      claim !== undefined && claim !== null ? claim : null,
      defaultOutput !== undefined && defaultOutput !== null ? defaultOutput : null,
    );
  }

  public payload(transaction: bitcoin.Transaction): Buffer | null {
    let solution: Buffer | null = null;

    for (const output of transaction.outs) {
      const script = bitcoin.script.decompile(output.script);
      // 检查是否以 OP_RETURN 开始
      if (script && script[0] === bitcoin.opcodes.OP_RETURN) {
        // 检查是否包含特定标记 "RUNE_TEST"
        if (
          script.length > 1 &&
          !Buffer.isBuffer(script[1]) &&
          script[1] === MAGIC_NUMBER
          // && script[1].toString() === this.TAG
        ) {
          // 提取随后的数据
          let payload = Buffer.alloc(0);
          for (let i = 2; i < script.length; i++) {
            if (Buffer.isBuffer(script[i])) {
              payload = Buffer.concat([payload, script[i] as Buffer]);
            }
          }
          solution = payload;
          break;
        } else {
          continue;
        }
      } else {
        continue;
      }
    }

    return solution;
  }
}

export function decodeOpReturn(scriptHex: string | Buffer, tag: String) {
  const scriptBuf = typeof scriptHex === 'string' ? Buffer.from(scriptHex, 'hex') : scriptHex;
  const script = bitcoin.script.decompile(scriptBuf);
  let payload: Buffer | null = null;
  // 检查是否以 OP_RETURN 开始
  if (script && script[0] === bitcoin.opcodes.OP_RETURN) {
    // 检查是否包含特定标记 "RUNE_TEST"
    if (script.length > 1 && Buffer.isBuffer(script[1]) && script[1].toString() === tag) {
      // 提取随后的数据
      let _payload = Buffer.alloc(0);
      for (let i = 2; i < script.length; i++) {
        if (Buffer.isBuffer(script[i])) {
          _payload = Buffer.concat([_payload, script[i] as Buffer]);
        }
      }
      payload = _payload;
    }
  }
  if (payload !== null) {
    let integers: bigint[] = [];
    let i = 0;

    while (i < payload.length) {
      const _payload = payload.subarray(i);
      const [integer, length] = varint.decode(_payload);
      integers.push(integer);
      i += length;
    }

    const message = Message.fromOpReturn(integers);

    let fields = message.fields;

    let cenotaph = message.cenotaph;

    let etching: Etching | null | undefined = null;

    let claim = fields.has(TAG_CLAIM) ? fields.get(TAG_CLAIM) : null;
    fields.delete(TAG_CLAIM);

    let deadline = fields.has(TAG_DEADLINE) ? fields.get(TAG_DEADLINE) : null;

    fields.delete(TAG_DEADLINE);

    let defaultOutput = fields.has(TAG_DEFAULT_OUTPUT) ? fields.get(TAG_DEFAULT_OUTPUT) : null;
    fields.delete(TAG_DEFAULT_OUTPUT);

    let divisibility = fields.has(TAG_DIVISIBILITY)
      ? Number(fields.get(TAG_DIVISIBILITY)! < BigInt(MAX_DIVISIBILITY) ? fields.get(TAG_DIVISIBILITY) : 0)
      : 0;
    fields.delete(TAG_DIVISIBILITY);

    let limit = fields.get(TAG_LIMIT);
    fields.delete(TAG_LIMIT);

    let rune = fields.get(TAG_RUNE);

    let cap = fields.has(TAG_CAP) ? fields.get(TAG_CAP) : null;

    fields.delete(TAG_CAP);

    let premine = fields.has(TAG_PREMINE) ? fields.get(TAG_PREMINE) : null;
    fields.delete(TAG_PREMINE);

    let spacers = fields.has(TAG_SPACERS) ? Number(fields.get(TAG_SPACERS)! < BigInt(MAX_SPACERS) ? fields.get(TAG_SPACERS) : 0) : 0;
    fields.delete(TAG_SPACERS);

    let symbol = fields.has(TAG_SYMBOL) ? charFromU32(Number(fields.get(TAG_SYMBOL))) : null;
    fields.delete(TAG_SYMBOL);

    let term = fields.has(TAG_TERM) ? (fields.get(TAG_TERM)! < BigInt(2) ** BigInt(32) - BigInt(1) ? Number(fields.get(TAG_TERM)) : null) : null;
    fields.delete(TAG_TERM);

    let etch, mint;
    let flags;
    if (fields.has(TAG_FLAGS)) {
      flags = fields.get(TAG_FLAGS);
      if (flags) {
        let _etch = new Flag(FlagTypes.Etch).take(flags);
        etch = _etch[0];
        flags = _etch[1];
        let _mint = new Flag(FlagTypes.Mint).take(flags);
        mint = _mint[0];
        flags = _mint[1];
      }
      fields.delete(TAG_FLAGS);
    }

    if (etch) {
      etching = new Etching(
        divisibility,
        mint ? new Mint(cap ?? null, deadline ?? null, limit ?? null, term !== null ? BigInt(term) : null) : null,
        rune ? new Rune(rune) : null,
        symbol,
        BigInt(spacers),
      );
    }

    // 假设 premine, cap, limit 可能是 undefined 或 null
    let premineValue = BigInt(premine || 0); // 使用适当的默认值
    let capValue = BigInt(cap || 0);
    let limitValue = BigInt(limit || 0);

    let overflow = false;

    try {
      // 尝试执行操作
      addU128(premineValue, mulU128(capValue, limitValue));
      // 如果这里没有抛出错误，意味着没有溢出
    } catch (e) {
      // 如果捕获到错误，说明发生了溢出
      overflow = true;
    }

    // if (fields.has(TAG_RUNE)) {
    //   const rune = fields.get(TAG_RUNE);
    //   etching = new Etching(
    //     fields.has(TAG_DIVISIBILITY) ? Number(fields.get(TAG_DIVISIBILITY)! < BigInt(MAX_DIVISIBILITY) ? fields.get(TAG_DIVISIBILITY) : 0) : 0,
    //     fields.has(TAG_LIMIT) ? fields.get(TAG_LIMIT)! : null,
    //     rune ? new Rune(rune) : new Rune(BigInt(0)),
    //     fields.has(TAG_SYMBOL) ? charFromU32(Number(fields.get(TAG_SYMBOL))) : null,
    //     fields.has(TAG_TERM) ? (fields.get(TAG_TERM)! < BigInt(2) ** BigInt(32) - BigInt(1) ? Number(fields.get(TAG_TERM)) : null) : null,
    //   );
    // }

    return new RuneStone(
      message.edicts,
      etching,
      overflow ||
        cenotaph ||
        (flags !== undefined && flags !== BigInt(0)) ||
        Array.from(fields.keys()).some(tag => Number.parseInt(tag.toString()) % 2 === 0),
      claim !== undefined && claim !== null ? claim : null,
      defaultOutput !== undefined && defaultOutput !== null ? defaultOutput : null,
    );
  } else {
    return null;
  }
}

export class Message {
  constructor(public cenotaph: boolean, public fields: Map<bigint, bigint>, public edicts: Edict[]) {}

  static fromIntegers(tx: Transaction, payload: bigint[]): Message {
    const fields = new Map<bigint, bigint>();
    const edicts: Edict[] = [];
    let cenotaph = false;
    for (let i = 0; i < payload.length; i += 2) {
      const tag = payload[i];

      if (tag === TAG_BODY) {
        let id = new RuneId(BigInt(0), BigInt(0));

        for (let j = i + 1; j < payload.length; j += 4) {
          const chunk = payload.slice(j, j + 4);

          if (chunk.length !== 4) {
            cenotaph = true;
            break;
          }

          // Assuming `id.next()` is an async function or a function that returns an object or null
          let next = id.next(chunk[0], chunk[1]);
          if (!next) {
            cenotaph = true;
            break;
          }

          // Assuming `Edict.fromIntegers()` is a function that returns an Edict object or null
          let edict = Edict.fromIntegers(tx, next, chunk[2], chunk[3]);
          if (!edict) {
            cenotaph = true;
            break;
          }

          id = next;
          edicts.push(edict);
        }
        break;
      }

      let value: bigint | undefined;
      if (payload[i + 1] !== undefined) {
        value = payload[i + 1];
      } else {
        cenotaph = true;
        break;
      }

      if (!fields.get(tag)) {
        fields.set(tag, value);
      }
    }

    return new Message(cenotaph, fields, edicts);
  }

  static fromOpReturn(payload: bigint[]): Message {
    const fields = new Map<bigint, bigint>();
    const edicts: Edict[] = [];
    let cenotaph = false;
    for (let i = 0; i < payload.length; i += 2) {
      const tag = payload[i];

      if (tag === TAG_BODY) {
        let id = new RuneId(BigInt(0), BigInt(0));

        for (let j = i + 1; i < payload.length; j += 4) {
          if (j + 3 >= payload.length) {
            cenotaph = true;
            break;
          }

          const chunk = payload.slice(j, j + 4);
          // Assuming `id.next()` is an async function or a function that returns an object or null
          let next = id.next(chunk[0], chunk[1]);
          if (!next) {
            cenotaph = true;
            break;
          }

          // Assuming `Edict.fromIntegers()` is a function that returns an Edict object or null
          let edict = Edict.fromOpReturn(next, chunk[2], chunk[3]);
          if (!edict) {
            cenotaph = true;
            break;
          }

          id = next;
          edicts.push(edict);
        }
        break;
      }

      let value: bigint | undefined;
      if (payload[i + 1] !== undefined) {
        value = payload[i + 1];
      } else {
        break;
      }

      if (!fields.get(tag)) {
        fields.set(tag, value);
      }
    }

    return new Message(cenotaph, fields, edicts);
  }
}

export function getScriptInstructions(script: Buffer) {
  const chunks = bitcoin.script.decompile(script);
  if (chunks === null) throw new Error('Invalid script');
  return chunks.map(chunk => {
    if (Buffer.isBuffer(chunk)) {
      return { type: 'data', value: chunk.toString('hex') };
    } else {
      return { type: 'opcode', value: bitcoin.script.toASM([chunk]).split(' ')[0] };
    }
  });
}

function charFromU32(code: number) {
  if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    // 超出 Unicode 范围或是代理对的编码
    return null;
  }
  return String.fromCodePoint(code);
}

export function chunkBuffer(buffer: Buffer, chunkSize: number) {
  assert(!isNaN(chunkSize) && chunkSize > 0, 'Chunk size should be positive number');
  const result: Buffer[] = [];
  const len = buffer.byteLength;
  let i = 0;
  while (i < len) {
    result.push(buffer.subarray(i, (i += chunkSize)));
  }
  return result;
}
