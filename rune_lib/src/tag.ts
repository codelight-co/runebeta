import * as varint from './varint';

export enum Tag {
  Body = 0,
  Flags = 2,
  Rune = 4,
  Limit = 6,
  Term = 8,
  Deadline = 10,
  DefaultOutput = 12,
  Claim = 14,
  Burn = 126,
  Cenotaph = 126,
  Divisibility = 1,
  Spacers = 3,
  Symbol = 5,
  Nop = 127,
}

export function tagEncoder(tag: bigint, value: bigint, target: number[]): number[] {
  target = varint.encodeToVec(tag, target);
  target = varint.encodeToVec(value, target);
  return target;
}

export function tagInto(tag: Tag): bigint {
  return BigInt(tag);
}
