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

  test('non_push_opcodes_in_runestone_are_ignored', () => {
    const psbt = new bitcoin.Psbt();
    psbt.addOutput({
      script: bitcoin.script.compile([
        bitcoin.opcodes.OP_RETURN,
        Buffer.from('RUNE_TEST'),
        Buffer.from([0, 1]),
        bitcoin.opcodes.OP_VERIFY,
        Buffer.from([2, 3]),
      ]),
      value: 0,
    });
    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);
    expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  });

  test('decipher_etching', () => {
    const _payload = payload([tagInto(Tag.Flags), flagMask(FlagTypes.Etch), tagInto(Tag.Body), BigInt(1), BigInt(2), BigInt(3)]);
    const psbt = new bitcoin.Psbt();

    psbt.addOutput({
      script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
      value: 0,
    });

    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);
    expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
    expect(d?.etching).toStrictEqual(new Etching(0, null, null, null, BigInt(0)));
  });

  test('etch_flag_is_required_to_etch_rune_even_if_mint_is_set', () => {
    const _payload = payload([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Mint),
      tagInto(Tag.Rune),
      BigInt(4),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(2),
      BigInt(3),
    ]);
    const psbt = new bitcoin.Psbt();

    psbt.addOutput({
      script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
      value: 0,
    });

    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);
    expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
    expect(d?.etching).toStrictEqual(null);
  });

  test('decipher_etching_with_term', () => {
    const _payload = payload([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Mint) | flagMask(FlagTypes.Etch),
      tagInto(Tag.Term),
      BigInt(4),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(2),
      BigInt(3),
    ]);
    const psbt = new bitcoin.Psbt();

    psbt.addOutput({
      script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
      value: 0,
    });

    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);
    expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
    expect(d?.etching).toStrictEqual(new Etching(0, new Mint(null, null, BigInt(4)), null, null, BigInt(0)));
  });

  test('decipher_etching_with_limit', () => {
    const _payload = payload([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Mint) | flagMask(FlagTypes.Etch),
      tagInto(Tag.Limit),
      BigInt(4),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(2),
      BigInt(3),
    ]);
    const psbt = new bitcoin.Psbt();

    psbt.addOutput({
      script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
      value: 0,
    });

    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);
    expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
    expect(d?.etching).toStrictEqual(new Etching(0, new Mint(null, BigInt(4), null), null, null, BigInt(0)));
  });

  test('duplicate_tags_are_ignored', () => {
    const _payload = payload([
      tagInto(Tag.Flags),
      flagMask(FlagTypes.Etch),
      tagInto(Tag.Rune),
      BigInt(4),
      tagInto(Tag.Body),
      BigInt(1),
      BigInt(2),
      BigInt(3),
    ]);
    const psbt = new bitcoin.Psbt();

    psbt.addOutput({
      script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
      value: 0,
    });

    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);
    expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
    expect(d?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), null, BigInt(0)));
  });

  test('unrecognized_odd_tag_is_ignored', () => {
    const _payload = payload([tagInto(Tag.Nop), BigInt(100), tagInto(Tag.Body), BigInt(1), BigInt(2), BigInt(3)]);
    const psbt = new bitcoin.Psbt();
    psbt.addOutput({
      script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
      value: 0,
    });

    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);

    expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  });

  test('unrecognized_even_tag_is_burn', () => {
    const _payload = payload([tagInto(Tag.Burn), BigInt(0), tagInto(Tag.Body), BigInt(1), BigInt(2), BigInt(3)]);
    const psbt = new bitcoin.Psbt();
    psbt.addOutput({
      script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
      value: 0,
    });

    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);
    expect(d?.burn).toEqual(true);
    expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  });

  test('unrecognized_flag_is_burn', () => {
    const _payload = payload([tagInto(Tag.Burn), flagMask(FlagTypes.Burn), tagInto(Tag.Body), BigInt(1), BigInt(2), BigInt(3)]);
    const psbt = new bitcoin.Psbt();
    psbt.addOutput({
      script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
      value: 0,
    });

    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);
    expect(d?.burn).toEqual(true);
    expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  });

  test('tag_with_no_value_is_ignored', () => {
    const _payload = payload([tagInto(Tag.Flags), BigInt(1), tagInto(Tag.Flags)]);

    const psbt = new bitcoin.Psbt();
    psbt.addOutput({
      script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
      value: 0,
    });

    const s = psbt.extractTransaction(false);
    const d = RuneStone.fromTransaction(s);
    expect(d?.etching).toStrictEqual(new Etching(0, null, null, null, BigInt(0)));
  });

  // test('additional_integers_in_body_are_ignored', () => {
  //   const _payload = payload([BigInt(2), BigInt(4), BigInt(0), BigInt(1), BigInt(2), BigInt(3), BigInt(4), BigInt(5)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);

  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  //   expect(d?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), null, BigInt(0)));
  // });

  // test('decipher_etching_with_divisibility', () => {
  //   const _payload = payload([BigInt(2), BigInt(4), BigInt(1), BigInt(5), BigInt(0), BigInt(1), BigInt(2), BigInt(3)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);

  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  //   expect(d?.etching).toStrictEqual(new Etching(5, null, new Rune(BigInt(4)), null, BigInt(0)));
  // });

  // test('divisibility_above_max_is_ignored', () => {
  //   const _payload = payload([BigInt(2), BigInt(4), BigInt(1), BigInt(MAX_DIVISIBILITY + 1), BigInt(0), BigInt(1), BigInt(2), BigInt(3)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);

  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  //   expect(d?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), null, BigInt(0)));
  // });

  // test('symbol_above_max_is_ignored', () => {
  //   const _payload = payload([BigInt(2), BigInt(4), BigInt(3), BigInt(0x10ffff + 1), BigInt(0), BigInt(1), BigInt(2), BigInt(3)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  //   expect(d?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), null, BigInt(0)));
  // });

  // test('decipher_etching_with_symbol', () => {
  //   const _payload = payload([BigInt(2), BigInt(4), BigInt(3), BigInt('a'.charCodeAt(0)), BigInt(0), BigInt(1), BigInt(2), BigInt(3)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  //   expect(d?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), 'a', BigInt(0)));
  // });

  // test('decipher_etching_with_divisibility_and_symbol', () => {
  //   const _payload = payload([
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
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  //   expect(d?.etching).toStrictEqual(new Etching(1, null, new Rune(BigInt(4)), 'a', BigInt(0)));
  // });

  // test('tag_values_are_not_parsed_as_tags', () => {
  //   const _payload = payload([BigInt(2), BigInt(4), BigInt(1), BigInt(0), BigInt(0), BigInt(1), BigInt(2), BigInt(3)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  //   expect(d?.etching).toStrictEqual(new Etching(0, null, new Rune(BigInt(4)), null, BigInt(0)));
  // });

  // test('runestone_may_contain_multiple_edicts', () => {
  //   const _payload = payload([BigInt(0), BigInt(1), BigInt(2), BigInt(3), BigInt(3), BigInt(5), BigInt(6)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);

  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  //   expect(d?.edicts[1]).toStrictEqual(new Edict(BigInt(4), BigInt(5), BigInt(6)));
  // });

  // test('id_deltas_saturate_to_max', () => {
  //   const _payload = payload([BigInt(0), BigInt(1), BigInt(2), BigInt(3), BigInt(2) ** BigInt(128) - BigInt(1), BigInt(5), BigInt(6)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  //   expect(d?.edicts[1]).toStrictEqual(new Edict(BigInt(2) ** BigInt(128) - BigInt(1), BigInt(5), BigInt(6)));
  // });

  // test('payload_pushes_are_concatenated', () => {
  //   const _payload = payload([BigInt(2), BigInt(4), BigInt(1), BigInt(5), BigInt(0), BigInt(1), BigInt(2), BigInt(3)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });

  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  //   expect(d?.etching).toStrictEqual(new Etching(5, null, new Rune(BigInt(4)), null, BigInt(0)));
  // });

  // test('runestone_may_be_in_second_output', () => {
  //   const _payload = payload([BigInt(0), BigInt(1), BigInt(2), BigInt(3)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([]),
  //     value: 0,
  //   });
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });
  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
  // });

  // test('runestone_may_be_after_non_matching_op_return', () => {
  //   const _payload = payload([BigInt(0), BigInt(1), BigInt(2), BigInt(3)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('FOO')]),
  //     value: 0,
  //   });
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
  //     value: 0,
  //   });
  //   const s = psbt.extractTransaction(false);
  //   const d = RuneStone.fromTransaction(s);
  //   expect(d?.edicts[0]).toStrictEqual(new Edict(BigInt(1), BigInt(2), BigInt(3)));
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
  //   const _payload = payload([BigInt(2), BigInt(4), BigInt(6), BigInt(2) ** BigInt(64)]);
  //   const psbt = new bitcoin.Psbt();
  //   psbt.addOutput({
  //     script: bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from('RUNE_TEST'), Buffer.from(_payload)]),
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
    const rs = decodeOpReturn(
      '6a0952554e455f544553544c710083f4d5aeff5882240100e45c02008c10030088eb0004008f34050085480600b6640700b66408008f34090084f47c0a0082240b0082240c0085480d00ba080e0082240f00854810008c101100ac78120085481300822414008548150082fefefefefefefefefefefefefefefed49e1816',
      'RUNE_TEST',
    );
    rs?.edicts.map(d => {
      console.log(d);
    });
  });
});
