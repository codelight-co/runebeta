export declare enum FlagTypes {
    Etch = 0,
    Terms = 1,
    Burn = 127
}
export declare class Flag {
    type: FlagTypes;
    constructor(type: FlagTypes);
    mask(): bigint;
    take(flags: bigint): [boolean, bigint];
    set(flags: bigint): bigint;
}
export declare function flagMask(type: FlagTypes): bigint;
export declare function flagInto(type: FlagTypes): bigint;
