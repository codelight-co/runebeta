export interface IMint {
    deadline: bigint | null;
    limit: bigint | null;
    term: bigint | null;
}
export declare class Mint {
    deadline: bigint | null;
    limit: bigint | null;
    term: bigint | null;
    constructor(deadline: bigint | null, limit: bigint | null, term: bigint | null);
    static fromJson(json: IMint): Mint;
    static fromJsonString(str: string): Mint;
    toJsonString(): string;
}
