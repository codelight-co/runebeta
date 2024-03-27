export declare const DIFFCHANGE_INTERVAL: bigint;
export declare const CLAIM_BIT: bigint;
export declare const MAX_DIVISIBILITY = 38;
export declare const MAX_LIMIT: bigint;
export declare const RESERVED: bigint;
export declare const MAX_SPACERS = 134217727;
export declare const MAGIC_NUMBER = 93;
export declare const OP_VERIFY = 105;
export declare class Rune {
    value: bigint;
    private STEPS;
    get id(): bigint;
    constructor(value: bigint);
    static minimumAtHeight(height: bigint): Rune;
    toString(): string;
    static fromString(s: string): Rune;
}
