import { Rune } from './rune';

export interface ISpacedRune {
  rune: Rune;
  limit: bigint | null;
  term: number | null;
}

export class SpacedRune implements ISpacedRune {
  public rune: Rune;
  public limit: bigint | null;
  public term: number | null;

  constructor(rune: Rune, limit: bigint | null, term: number | null) {
    this.rune = rune;
    this.limit = limit;
    this.term = term;
  }

  static fromString(s: string): SpacedRune | Error {
    let rune = BigInt(0);
    let spacers = BigInt(0);
    let limit = BigInt(0);
    let term = 0;
    let runeStr = '';
    for (const c of s) {
      if (c >= 'A' && c <= 'Z') {
        runeStr += c;
      } else if (c === '.' || c === '•') {
        const flag = BigInt(1) << BigInt(runeStr.length - 1);
        if ((spacers & flag) !== BigInt(0)) {
          return new Error('double spacer');
        }
        spacers |= flag;
      } else {
        return new Error('invalid character');
      }
    }
    if (32 - spacers.toString(2).length >= runeStr.length) {
      return new Error('trailing spacer');
    }
    rune = Rune.fromString(runeStr).id;
    return new SpacedRune(new Rune(rune), limit, term);
  }
}
