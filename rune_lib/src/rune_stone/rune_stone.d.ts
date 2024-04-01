/// <reference types="node" />
import { Edict } from './edict';
import { Etching } from './etching';
import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
export declare class RuneStone {
    edicts: Edict[];
    etching: Etching | null;
    burn: boolean;
    claim: bigint | null;
    defaultOutput: bigint | null;
    TAG: string;
    constructor(edicts: Edict[], etching: Etching | null, burn: boolean, claim: bigint | null, defaultOutput: bigint | null);
    setTag(tag: string): string;
    static fromTransaction(transaction: Transaction): RuneStone | null;
    encipher(): Buffer;
    decipher(transaction: bitcoin.Transaction): RuneStone | null;
    payload(transaction: bitcoin.Transaction): Buffer | null;
}
export declare class Message {
    fields: Map<bigint, bigint>;
    edicts: Edict[];
    constructor(fields: Map<bigint, bigint>, edicts: Edict[]);
    static fromIntegers(payload: bigint[]): Message;
}
export declare function getScriptInstructions(script: Buffer): {
    type: string;
    value: string;
}[];
export declare function chunkBuffer(buffer: Buffer, chunkSize: number): Buffer[];
