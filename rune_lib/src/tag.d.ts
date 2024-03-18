export declare enum Tag {
    Body = 0,
    Flags = 2,
    Rune = 4,
    Limit = 6,
    Term = 8,
    Deadline = 10,
    DefaultOutput = 12,
    Claim = 14,
    Burn = 126,
    Divisibility = 1,
    Spacers = 3,
    Symbol = 5,
    Nop = 127
}
export declare function tagEncoder(tag: bigint, value: bigint, target: number[]): number[];
export declare function tagInto(tag: Tag): bigint;
