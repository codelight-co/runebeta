export interface IMint {
    cap: bigint | null;
    deadline: bigint | null;
    limit: bigint | null;
    term: bigint | null;
}
export declare class Mint {
    cap: bigint | null;
    deadline: bigint | null;
    limit: bigint | null;
    term: bigint | null;
    constructor(cap: bigint | null, deadline: bigint | null, limit: bigint | null, term: bigint | null);
    static fromJson(json: IMint): Mint;
    static fromJsonString(str: string): Mint;
    toJsonString(): string;
}
