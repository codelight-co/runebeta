// pub struct Etching {
//     pub(crate) divisibility: u8,
//     pub(crate) limit: Option<u128>,
//     pub(crate) rune: Rune,
//     pub(crate) symbol: Option<char>,
//     pub(crate) term: Option<u32>,
//   }

import { Mint } from './mint';
import { Rune } from './rune';

interface IEtching {
  divisibility: number;
  mint: Mint | null;
  rune: Rune | null;
  symbol: string | null;
  spacers: bigint;
  premine: bigint | null;
}

export class Etching {
  constructor(
    public divisibility: number,
    public mint: Mint | null,
    public rune: Rune | null,
    public symbol: string | null,
    public spacers: bigint = BigInt(0),
    public premine: bigint | null = null,
  ) {}

  static fromJson(json: IEtching): Etching {
    return new Etching(json.divisibility, json.mint, json.rune, json.symbol, json.spacers, json.premine);
  }

  static fromJsonString(str: string): Etching {
    const _obj = JSON.parse(str);
    return Etching.fromJson({
      divisibility: _obj.divisibility,
      mint: _obj.limit ? Mint.fromJsonString(_obj.mint) : null,
      rune: Rune.fromString(_obj.rune),
      symbol: _obj.symbol,
      spacers: BigInt(_obj.spacers),
      premine: _obj.premine ? BigInt(_obj.premine) : null,
    });
  }

  public toJson(): IEtching {
    return {
      divisibility: this.divisibility,
      mint: this.mint,
      rune: this.rune,
      symbol: this.symbol,
      spacers: this.spacers,
      premine: this.premine,
    };
  }

  public toJsonString(): string {
    return JSON.stringify({
      divisibility: this.divisibility,
      mint: this.mint?.toJsonString(),
      rune: this.rune?.toString(),
      symbol: this.symbol,
      spacers: this.spacers.toString(),
      premine: this.premine?.toString(),
    });
  }
}
