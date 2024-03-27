export declare enum Tag {
    Body = 0,
    Flags = 2,
    Rune = 4,
    Limit = 6,
    Term = 8,
    Deadline = 10,
    DefaultOutput = 12,
    Claim = 14,
    Cap = 16,
    Premine = 18,
    Burn = 126,
    Cenotaph = 126,
    Divisibility = 1,
    Spacers = 3,
    Symbol = 5,
    Nop = 127
}
export declare function tagEncoder(tag: bigint, value: bigint, target: number[]): number[];
export declare function tagInto(tag: Tag): bigint;
export declare function tagTaker(tag: bigint, value: bigint, fields: Map<bigint, bigint[]>): bigint | null;
