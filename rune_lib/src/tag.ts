import * as varint from './varint';

export enum Tag {
  Body = 0,
  Flags = 2,
  Rune = 4,
  Limit = 6,
  Term = 8,
  Deadline = 10,
  DefaultOutput = 12,
  Claim = 14,
  Cap = 16,
  Premine = 18,
  Burn = 126,
  Cenotaph = 126,
  Divisibility = 1,
  Spacers = 3,
  Symbol = 5,
  Nop = 127,
}

export function tagEncoder(tag: bigint, value: bigint, target: number[]): number[] {
  target = varint.encodeToVec(tag, target);
  target = varint.encodeToVec(value, target);
  return target;
}

export function tagInto(tag: Tag): bigint {
  return BigInt(tag);
}

export function tagTaker(tag: bigint, value: bigint, fields: Map<bigint, bigint[]>): bigint | null {
  const field = fields.get(tag);

  if (field === undefined) {
    return null;
  }

  fields.delete(tag);

  field.push(value);

  return BigInt(field.length);
}

// pub(super) fn take<const N: usize, T>(
//   self,
//   fields: &mut HashMap<u128, VecDeque<u128>>,
//   with: impl Fn([u128; N]) -> Option<T>,
// ) -> Option<T> {
//   let field = fields.get_mut(&self.into())?;

//   let mut values: [u128; N] = [0; N];

//   for (i, v) in values.iter_mut().enumerate() {
//     *v = *field.get(i)?;
//   }

//   let value = with(values)?;

//   field.drain(0..N);

//   if field.is_empty() {
//     fields.remove(&self.into()).unwrap();
//   }

//   Some(value)
// }
