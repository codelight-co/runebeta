// pub struct Edict {
//     pub id: u128,
//     pub amount: u128,
//     pub output: u128,
//   }

export interface IEdict {
  id: bigint;
  amount: bigint;
  output: bigint;
}

export class Edict {
  constructor(
    public id: bigint,
    public amount: bigint,
    public output: bigint,
  ) {}

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
