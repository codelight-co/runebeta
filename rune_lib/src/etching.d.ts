import { Mint } from './mint';
import { Rune } from './rune';
interface IEtching {
    divisibility: number;
    mint: Mint | null;
    rune: Rune | null;
    symbol: string | null;
    spacers: bigint;
}
export declare class Etching {
    divisibility: number;
    mint: Mint | null;
    rune: Rune | null;
    symbol: string | null;
    spacers: bigint;
    constructor(divisibility: number, mint: Mint | null, rune: Rune | null, symbol: string | null, spacers?: bigint);
    static fromJson(json: IEtching): Etching;
    static fromJsonString(str: string): Etching;
    toJson(): IEtching;
    toJsonString(): string;
}
export {};
