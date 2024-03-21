export class RuneId {
  public block: bigint;
  public tx: number;

  constructor(block: bigint, tx: number) {
    this.block = block;
    this.tx = tx;
  }

  static tryFrom(n: bigint): RuneId | Error {
    const block = n >> BigInt(16);
    const tx = Number(n & BigInt(0xffff));
    if (!Number.isSafeInteger(tx)) {
      return new Error('Conversion error');
    }
    return new RuneId(block, tx);
  }

  static toBigInt(id: RuneId): bigint {
    return (id.block << BigInt(16)) | BigInt(id.tx);
  }

  public toBigInt(): bigint {
    return (this.block << BigInt(16)) | BigInt(this.tx);
  }

  public toString(): string {
    return `${this.block.toString()}:${this.tx}`;
  }

  static fromString(s: string): RuneId | Error {
    const parts = s.split(':');
    if (parts.length !== 2) {
      return new Error('Invalid rune ID format');
    }
    const block = BigInt(parts[0]);
    const tx = parseInt(parts[1]);
    if (isNaN(tx)) {
      return new Error('Invalid number format');
    }
    return new RuneId(block, tx);
  }
}

//   // 使用示例
//   const runeId = new RuneId(123, 456);
//   console.log(runeId.toString());

//   const fromBigInt = RuneId.tryFrom(BigInt(123456));
//   if (!(fromBigInt instanceof Error)) {
//     console.log(fromBigInt);
//   }

//   const fromString = RuneId.fromString("123/456");
//   if (!(fromString instanceof Error)) {
//     console.log(fromString);
//   }
