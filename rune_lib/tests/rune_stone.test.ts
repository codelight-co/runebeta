import { CLAIM_BIT, Edict, Etching, MAX_DIVISIBILITY, Rune, RuneId, RuneStone, decodeOpReturn } from '../src/index';
import * as bitcoin from 'bitcoinjs-lib';
import * as varint from '../src/index';
import { Tag, tagInto } from '../src/tag';
import { Flag, FlagTypes, flagMask } from '../src/flag';
import { Mint } from '../src/mint';

function payload(integers: bigint[]): Uint8Array {
  let payload: number[] = [];

  for (let i = 0; i < integers.length; i++) {
    const integer = integers[i];
    const encoded = varint.encode(integer);
    payload.push(...encoded);
  }

  return new Uint8Array(payload);
}

const rune_id = (tx: bigint) => new RuneId(BigInt(1), tx);

function opReturn(payload: Uint8Array): Buffer {
  return bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, varint.MAGIC_NUMBER, Buffer.from(payload)]);
}

function decipherTest(integers: bigint[]) {
  let _payload = payload(integers);

  const psbt = new bitcoin.Psbt();
  psbt.setVersion(2);
  psbt.locktime = 0;
  psbt.addOutput({
    script: bitcoin.script.compile([
      bitcoin.opcodes.OP_RETURN,
      varint.MAGIC_NUMBER,
      Buffer.from(_payload), // OP_PUSHBYTES_4
    ]),
    value: 0,
  });

  const s = psbt.extractTransaction(false);
  const d = RuneStone.fromTransaction(s);
  return d;
}

function caseSize(edicts: Edict[], etching: Etching | null, size: number) {
  expect(new RuneStone(edicts, etching, false, null, null).encipher().length - 1 - Buffer.from('RUNE_TEST').length).toBe(size);
}

describe('rune_stone', () => {
  test('from_transaction_returns_none_if_decipher_returns_error', () => {
    expect(
      RuneStone.fromTransaction(
        bitcoin.Transaction.fromHex(
          '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0704ffff001d013affffffff0100f2052a010000001976a914f5b2b3b6f9a5c9e8c3c9c9c9c9c9c9c9c9c9c9c988ac00000000',
        ),
      ),
    ).toBe(null);
  });

  // test.skip('non_push_opcodes_in_runestone_are_ignored', () => {
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([
  //       bitcoin.opcodes.OP_RETURN,
  //       varint.MAGIC_NUMBER,
  //       bitcoin.opcodes.OP_VERIFY,
  //       Buffer.from([0]),
  //       Buffer.from(varint.encode(rune_id(BigInt(1)))),
  //       Buffer.from([2, 0]),
  //     ]),
  //     value: 0,
  //   });
  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  // });

  test('deciphering_empty_runestone_is_successful', () => {
    const psbt = new bitcoin.Psbt();
    psbt.addOutput({
      script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, varint.MAGIC_NUMBER, bitcoin.opcodes.OP_VERIFY]),
      value: 0,
    });
    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);
    expect(d).toBeTruthy();
  });

  test.skip('error_in_input_aborts_search_for_runestone', () => {
    const psbt = new bitcoin.Psbt();
    psbt.addOutput({
      script: bitcoin.script.compile([
        bitcoin.opcodes.OP_RETURN,
        0x09, // OP_PUSHBYTES_9
        varint.MAGIC_NUMBER,
        0x04, // OP_PUSHBYTES_4
      ]),
      value: 0,
    });
    psbt.addOutput({
      script: bitcoin.script.compile([
        bitcoin.opcodes.OP_RETURN,
        varint.MAGIC_NUMBER,
        Buffer.from([1, 2, 3]), // OP_PUSHBYTES_4
      ]),
      value: 0,
    });

    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);
    expect(d).toBeNull();
  });

  test('deciphering_non_empty_runestone_is_successful', () => {
    let rs = decipherTest([
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);
    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  });

  test('decipher_etching', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Etch),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);
    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  });

  test('decipher_etching_with_rune', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Etch),
      tagInto(Tag.Rune),
      BigInt(4),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);
    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
    expect(rs?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), null, BigInt(0)));
  });

  test('etch_flag_is_required_to_etch_rune_even_if_mint_is_set', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Mint),
      tagInto(Tag.Term),
      BigInt(4),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
    expect(rs?.etching).toBeNull();
  });

  test('decipher_etching_with_term', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Mint) | flagMask(FlagTypes.Etch),
      tagInto(Tag.Term),
      BigInt(4),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
    expect(rs?.etching).toStrictEqual(new Etching(0, new Mint(null, null, null, BigInt(4)), null, null, BigInt(0)));
  });

  test('decipher_etching_with_limit', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Mint) | flagMask(FlagTypes.Etch),
      tagInto(Tag.Limit),
      BigInt(4),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
    expect(rs?.etching).toStrictEqual(new Etching(0, new Mint(null, null, BigInt(4), null), null, null, BigInt(0)));
  });

  test('duplicate_tags_are_ignored', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Etch),
      tagInto(Tag.Rune),
      BigInt(4),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
    expect(rs?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), null, BigInt(0)));
  });

  test('unrecognized_odd_tag_is_ignored', () => {
    const rs = decipherTest([
      tagInto(Tag.Nop),
      BigInt(100),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  });

  test('runestone_with_unrecognized_even_tag_is_cenotaph', () => {
    const rs = decipherTest([
      tagInto(Tag.Cenotaph),
      BigInt(0),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.cenotaph).toEqual(true);
    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  });

  test('runestone_with_unrecognized_flag_is_cenotaph', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      tagInto(Tag.Cenotaph),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.cenotaph).toEqual(true);
    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  });

  test('runestone_with_edict_id_with_zero_block_and_nonzero_tx_is_cenotaph', () => {
    const rs = decipherTest([
      tagInto(Tag.Body),
      BigInt(0),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.cenotaph).toEqual(true);
    expect(rs?.edicts.length).toBe(0);
  });

  test('runestone_with_output_over_max_is_cenotaph', () => {
    const rs = decipherTest([
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(2),
      //
    ]);

    expect(rs?.cenotaph).toEqual(true);
    expect(rs?.edicts.length).toBe(0);
  });

  test('tag_with_no_value_is_cenotaph', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      BigInt(1),
      tagInto(Tag.Flags),
      //
    ]);
    expect(rs?.cenotaph).toEqual(true);
    expect(rs?.edicts.length).toBe(0);
  });

  test('trailing_integers_in_body_is_cenotaph', () => {
    let integers = [
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ];

    for (let i = 0; i < 4; i += 1) {
      let rs = decipherTest(integers);
      if (i === 0) {
        expect(rs?.cenotaph).toEqual(false);
      } else {
        expect(rs?.cenotaph).toEqual(true);
      }

      expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
      integers.push(BigInt(0));
    }
  });

  test('decipher_etching_with_divisibility', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Etch),
      tagInto(Tag.Rune),
      BigInt(4),
      tagInto(Tag.Divisibility),
      BigInt(5),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
    expect(rs?.etching).toStrictEqual(new Etching(5, null, new Rune(BigInt(4)), null, BigInt(0)));
  });

  // test('unrecognized_flag_is_burn', () => {
  //   const rs = decipherTest([tagInto(Tag.Burn), flagMask(FlagTypes.Burn), tagInto(Tag.Body), rune_id(BigInt(1)), BigInt(2), BigInt(0)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.cenotaph).toEqual(true);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  // });

  // test('tag_with_no_value_is_ignored', () => {
  //   const rs = decipherTest([tagInto(Tag.Flags), BigInt(1), tagInto(Tag.Flags)]);

  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.etching).toStrictEqual(new Etching(0, null, null, null, BigInt(0)));
  // });

  // test('additional_integers_in_body_are_ignored', () => {
  //   const rs = decipherTest([
  //     tagInto(Tag.Flags),
  //     flagMask(FlagTypes.Etch),
  //     tagInto(Tag.Rune),
  //     BigInt(4),
  //     tagInto(Tag.Body),
  //     rune_id(BigInt(1)),
  //     BigInt(2),
  //     BigInt(0),
  //     BigInt(4),
  //     BigInt(5),
  //   ]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);

  //   expect(d?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  //   expect(d?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), null, BigInt(0)));
  // });

  test('decipher_etching_with_divisibility_and_symbol', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Etch),
      tagInto(Tag.Rune),
      BigInt(4),
      tagInto(Tag.Divisibility),
      BigInt(1),
      tagInto(Tag.Symbol),
      BigInt('a'.charCodeAt(0)),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
    expect(rs?.etching).toStrictEqual(new Etching(1, null, new Rune(BigInt(4)), 'a', BigInt(0), null));
  });

  test('divisibility_above_max_is_ignored', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Etch),
      tagInto(Tag.Rune),
      BigInt(4),
      tagInto(Tag.Divisibility),
      BigInt(MAX_DIVISIBILITY + 1),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
    expect(rs?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), null, BigInt(0)));
  });

  test('symbol_above_max_is_ignored', () => {
    const rs = decipherTest([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Etch),
      tagInto(Tag.Symbol),
      BigInt(0x10ffff + 1),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(1),
      BigInt(2),
      BigInt(0),
      //
    ]);

    expect(rs?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
    expect(rs?.etching).toStrictEqual(new Etching(0, null, null, null, BigInt(0), null));
  });

  // test('decipher_etching_with_symbol', () => {
  //   const rs = decipherTest([BigInt(2), BigInt(4), BigInt(3), BigInt('a'.charCodeAt(0)), BigInt(0), rune_id(BigInt(1)), BigInt(2), BigInt(0)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  //   expect(d?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), 'a', BigInt(0)));
  // });

  // test('decipher_etching_with_divisibility_and_symbol', () => {
  //   const rs = decipherTest([
  //     BigInt(2),
  //     BigInt(4),
  //     BigInt(1),
  //     BigInt(1),
  //     BigInt(3),
  //     BigInt('a'.charCodeAt(0)),
  //     BigInt(0),
  //     BigInt(1),
  //     BigInt(2),
  //     BigInt(3),
  //   ]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  //   expect(d?.etching).toStrictEqual(new Etching(1, null, new Rune(BigInt(4)), 'a', BigInt(0)));
  // });

  // test('tag_values_are_not_parsed_as_tags', () => {
  //   const rs = decipherTest([BigInt(2), BigInt(4), BigInt(1), BigInt(0), BigInt(0), rune_id(BigInt(1)), BigInt(2), BigInt(0)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  //   expect(d?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), null, BigInt(0)));
  // });

  // test('runestone_may_contain_multiple_edicts', () => {
  //   const rs = decipherTest([BigInt(0), rune_id(BigInt(1)), BigInt(2), BigInt(0), BigInt(3), BigInt(5), BigInt(6)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);

  //   expect(d?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  //   expect(d?.edicts[1]).toStrictEqual(new Edict(BigInt(4), BigInt(5), BigInt(6)));
  // });

  // test('id_deltas_saturate_to_max', () => {
  //   const rs = decipherTest([BigInt(0), rune_id(BigInt(1)), BigInt(2), BigInt(0), BigInt(2) ** BigInt(128) - BigInt(1), BigInt(5), BigInt(6)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  //   expect(d?.edicts[1]).toStrictEqual(new Edict(BigInt(2) ** BigInt(128) - BigInt(1), BigInt(5), BigInt(6)));
  // });

  // test('payload_pushes_are_concatenated', () => {
  //   const rs = decipherTest([BigInt(2), BigInt(4), BigInt(1), BigInt(5), BigInt(0), rune_id(BigInt(1)), BigInt(2), BigInt(0)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  //   expect(d?.etching).toStrictEqual(new Etching(5, null, new Rune(BigInt(4)), null, BigInt(0)));
  // });

  // test('runestone_may_be_in_second_output', () => {
  //   const rs = decipherTest([BigInt(0), rune_id(BigInt(1)), BigInt(2), BigInt(0)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([]),
  //     value: 0,
  //   });
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });
  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  // });

  // test('runestone_may_be_after_non_matching_op_return', () => {
  //   const rs = decipherTest([BigInt(0), rune_id(BigInt(1)), BigInt(2), BigInt(0)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('FOO')]),
  //     value: 0,
  //   });
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });
  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(rune_id(BigInt(1)), BigInt(2), BigInt(0)));
  // });

  // test('runestone_size', () => {
  //   caseSize([], null, 1);
  //   caseSize([], new Etching(0, null, new Rune(BigInt(0)), null, BigInt(0)), 4);
  //   caseSize([], new Etching(MAX_DIVISIBILITY, null, new Rune(BigInt(0)), null, BigInt(0)), 6);
  //   caseSize([], new Etching(MAX_DIVISIBILITY, null, new Rune(BigInt(0)), '$', BigInt(0)), 8);
  //   caseSize([], new Etching(0, null, new Rune(BigInt(2) ** BigInt(128) - BigInt(1)), null, BigInt(0)), 22);
  //   caseSize(
  //     [new Edict(RuneId.toBigInt(new RuneId(0, 0)), BigInt(0), BigInt(0))],
  //     new Etching(MAX_DIVISIBILITY, null, new Rune(BigInt(2) ** BigInt(128) - BigInt(1)), null, BigInt(0)),
  //     28,
  //   );
  //   caseSize(
  //     [new Edict(RuneId.toBigInt(new RuneId(0, 0)), BigInt(2) ** BigInt(128) - BigInt(1), BigInt(0))],
  //     new Etching(MAX_DIVISIBILITY, null, new Rune(BigInt(2) ** BigInt(128) - BigInt(1)), null, BigInt(0)),
  //     46,
  //   );

  //   caseSize([new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(0), BigInt(0))], null, 11);
  //   caseSize([new Edict(CLAIM_BIT, BigInt(0), BigInt(0))], null, 12);
  //   caseSize([new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(128) - BigInt(1), BigInt(0))], null, 29);
  //   caseSize(
  //     [
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(128) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(128) - BigInt(1), BigInt(0)),
  //     ],
  //     null,
  //     50,
  //   );

  //   caseSize(
  //     [
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(128) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(128) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(128) - BigInt(1), BigInt(0)),
  //     ],
  //     null,
  //     71,
  //   );
  //   caseSize(
  //     [
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //     ],
  //     null,
  //     56,
  //   );

  //   caseSize(
  //     [
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //     ],
  //     null,
  //     68,
  //   );
  //   caseSize(
  //     [
  //       new Edict(RuneId.toBigInt(new RuneId(0, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(0, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(0, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(0, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(0, 65535)), BigInt(2) ** BigInt(64) - BigInt(1), BigInt(0)),
  //     ],
  //     null,
  //     65,
  //   );
  //   caseSize(
  //     [
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt('1000000000000000000'), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt('1000000000000000000'), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt('1000000000000000000'), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt('1000000000000000000'), BigInt(0)),
  //       new Edict(RuneId.toBigInt(new RuneId(1000000, 65535)), BigInt('1000000000000000000'), BigInt(0)),
  //     ],
  //     null,
  //     63,
  //   );
  // });

  // test('', () => {
  //   const rs = decipherTest([BigInt(2), BigInt(4), BigInt(6), BigInt(2) ** BigInt(64)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: opReturn(_payload),
  //     value: 0,
  //   });
  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   console.log(d);
  //   expect(d?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), null, BigInt(0)));
  // });
});

// test decode op_return
describe('decode op return', () => {
  test('decode op_return', () => {
    const arr = [
      '6a0952554e455f544553541a020304b0f2bfa4e37f05240a85b088ff7406bc834008809d9e0d',
      '6a0952554e455f544553541a020304b0f2bfa4e37f05240a85b088df1206bc834008809d9e0d',
      '6a0952554e455f54455354100083f5c48aff63a2c2bbccfb86ff0001',
      '6a0952554e455f54455354100083f5c48aff6399d1ccb9bc84ff0002',
    ];
    let rss: any[] = [];
    let edicts: any[] = [];
    let etching: any[] = [];
    for (let scriptPubkey of arr) {
      const rs = decodeOpReturn(scriptPubkey, 'RUNE_TEST');
      if (rs) {
        rss.push(rs);
        edicts.push(...rs.edicts);
        etching.push(rs.etching);
      }
    }
    console.table(rss);
    console.table(edicts);
    console.table(etching);
  });
});

test('decode op_return', () => {
  const rs = decodeOpReturn('6a0952554e455f54455354170e83f5c48aff630083f5c48aff63a2c2bbccfb86ff0001', 'RUNE_TEST');
  console.log(rs);
});
