export enum FlagTypes {
  Etch = 0,
  Mint = 1,
  Burn = 127,
}

export class Flag {
  constructor(public type: FlagTypes) {}
  public mask(): bigint {
    return BigInt(1) << BigInt(this.type);
  }

  public take(flags: bigint): boolean {
    const mask = this.mask();
    const set = (flags & mask) !== BigInt(0);
    return set;
  }

  public set(flags: bigint): bigint {
    return flags | this.mask();
  }
}

export function flagMask(type: FlagTypes) {
  return new Flag(type).mask();
}

export function flagInto(type: FlagTypes) {
  return BigInt(type);
}
