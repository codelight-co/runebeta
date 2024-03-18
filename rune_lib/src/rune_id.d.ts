export declare class RuneId {
    height: number;
    index: number;
    constructor(height: number, index: number);
    static tryFrom(n: bigint): RuneId | Error;
    static toBigInt(id: RuneId): bigint;
    toString(): string;
    static fromString(s: string): RuneId | Error;
}
