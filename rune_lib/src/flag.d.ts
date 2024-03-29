export declare enum FlagTypes {
    Etch = 0,
    Mint = 1,
    Burn = 127
}
export declare class Flag {
    type: FlagTypes;
    constructor(type: FlagTypes);
    mask(): bigint;
    take(flags: bigint): boolean;
    set(flags: bigint): bigint;
}
export declare function flagMask(type: FlagTypes): bigint;
export declare function flagInto(type: FlagTypes): bigint;
