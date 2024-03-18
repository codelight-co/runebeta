import { Rune } from './rune';
export interface ISpacedRune {
    rune: Rune;
    limit: bigint | null;
    term: number | null;
}
export declare class SpacedRune implements ISpacedRune {
    rune: Rune;
    limit: bigint | null;
    term: number | null;
    constructor(rune: Rune, limit: bigint | null, term: number | null);
    static fromString(s: string): SpacedRune | Error;
}
