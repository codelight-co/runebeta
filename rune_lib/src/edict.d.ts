export interface IEdict {
    id: bigint;
    amount: bigint;
    output: bigint;
}
export declare class Edict {
    id: bigint;
    amount: bigint;
    output: bigint;
    constructor(id: bigint, amount: bigint, output: bigint);
    static fromJson(json: IEdict): Edict;
    static fromJsonString(str: string): Edict;
    toJson(): IEdict;
    toJsonString(): string;
}
