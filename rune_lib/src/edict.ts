// pub struct Edict {
//     pub id: u128,
//     pub amount: u128,
//     pub output: u128,
//   }

import { Transaction } from 'bitcoinjs-lib';
import { RuneId } from './rune_id';

export interface IEdict {
  id: bigint;
  amount: bigint;
  output: bigint;
}

export class Edict {
  constructor(public id: bigint, public amount: bigint, public output: bigint) {}

  static fromIntegers(tx: Transaction, id: bigint, amount: bigint, output: bigint): Edict | null {
    let _id = RuneId.tryFrom(id);

    if (_id instanceof Error) {
      return null;
    } else {
      if (_id.block === BigInt(0) && _id.tx > 0) {
        return null;
      }

      if (output > BigInt(tx.outs.length)) {
        return null;
      }
      return new Edict(id, amount, output);
    }
  }

  static fromOpReturn(id: bigint, amount: bigint, output: bigint): Edict | null {
    let _id = RuneId.tryFrom(id);

    if (_id instanceof Error) {
      return null;
    } else {
      if (_id.block === BigInt(0) && _id.tx > 0) {
        return null;
      }

      if (output > BigInt(1)) {
        return null;
      }
      return new Edict(id, amount, output);
    }
  }

  static fromJson(json: IEdict): Edict {
    return new Edict(json.id, json.amount, json.output);
  }

  static fromJsonString(str: string): Edict {
    const _obj = JSON.parse(str);
    return Edict.fromJson({
      id: BigInt(_obj.id),
      amount: BigInt(_obj.amount),
      output: BigInt(_obj.output),
    });
  }

  public toJson(): IEdict {
    return {
      id: this.id,
      amount: this.amount,
      output: this.output,
    };
  }

  public toJsonString() {
    return JSON.stringify({
      id: this.id.toString(),
      amount: this.amount.toString(),
      output: this.output.toString(),
    });
  }
}
