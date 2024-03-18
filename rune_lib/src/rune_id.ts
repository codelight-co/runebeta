export class RuneId {
  public height: number;
  public index: number;

  constructor(height: number, index: number) {
    this.height = height;
    this.index = index;
  }

  static tryFrom(n: bigint): RuneId | Error {
    const height = Number(n >> BigInt(16));
    const index = Number(n & BigInt(0xffff));
    if (!Number.isSafeInteger(height) || !Number.isSafeInteger(index)) {
      return new Error('Conversion error');
    }
    return new RuneId(height, index);
  }

  static toBigInt(id: RuneId): bigint {
    return (BigInt(id.height) << BigInt(16)) | BigInt(id.index);
  }

  public toString(): string {
    return `${this.height}/${this.index}`;
  }

  static fromString(s: string): RuneId | Error {
    const parts = s.split(':');
    if (parts.length !== 2) {
      return new Error('Invalid rune ID format');
    }
    const height = parseInt(parts[0]);
    const index = parseInt(parts[1]);
    if (isNaN(height) || isNaN(index)) {
      return new Error('Invalid number format');
    }
    return new RuneId(height, index);
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
