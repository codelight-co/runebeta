/// <reference types="node" />
import { Edict } from './edict';
import { Etching } from './etching';
import * as bitcoin from 'bitcoinjs-lib';
import { Transaction } from 'bitcoinjs-lib';
export declare class RuneStone {
    edicts: Edict[];
    etching: Etching | null;
    cenotaph: boolean;
    claim: bigint | null;
    defaultOutput: bigint | null;
    constructor(edicts: Edict[], etching: Etching | null, cenotaph: boolean, claim: bigint | null, defaultOutput: bigint | null);
    static fromTransaction(transaction: Transaction): RuneStone | null;
    encipher(): Buffer;
    decipher(transaction: bitcoin.Transaction): RuneStone | null;
    payload(transaction: bitcoin.Transaction): Buffer | null;
}
export declare function decodeOpReturn(scriptHex: string | Buffer, tag: String): RuneStone | null;
export declare class Message {
    cenotaph: boolean;
    fields: Map<bigint, bigint>;
    edicts: Edict[];
    constructor(cenotaph: boolean, fields: Map<bigint, bigint>, edicts: Edict[]);
    static fromIntegers(tx: Transaction, payload: bigint[]): Message;
    static fromOpReturn(payload: bigint[]): Message;
}
export declare function getScriptInstructions(script: Buffer): {
    type: string;
    value: string;
}[];
export declare function chunkBuffer(buffer: Buffer, chunkSize: number): Buffer[];
