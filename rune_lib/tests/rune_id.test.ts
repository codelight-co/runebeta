import { RuneId } from '../src/index';

describe('rune_id', () => {
  test('should be ok', () => {
    // 使用示例

    const fromBigInt = RuneId.tryFrom(BigInt(0x060504030201));
    const runeId = new RuneId(0x06050403, 0x0201);
    expect(fromBigInt.toString()).toEqual(runeId.toString());

    const runeId2 = new RuneId(3, 1);
    expect(RuneId.toBigInt(runeId2)).toBe(BigInt(196609));
    // if (!(fromBigInt instanceof Error)) {
    //   console.log(fromBigInt);
    // }
    const fromString = RuneId.fromString('1:2');
    expect((fromString as RuneId).height).toEqual(1);
    expect((fromString as RuneId).index).toEqual(2);

    // if (!(fromString instanceof Error)) {
    //   console.log(fromString);
    // }
  });
});
