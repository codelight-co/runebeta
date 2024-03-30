export function decode(buffer: Uint8Array): [bigint, number] {
  let n: bigint = BigInt(0)
  let i = 0

  while (true) {
    if (i >= buffer.length) {
      throw new Error("Varint decoding error: Buffer underflow")
    }

    const byte = BigInt(buffer[i])

    if (byte < BigInt(128)) {
      return [n + byte, i + 1]
    }

    n += byte - BigInt(127)
    n *= BigInt(128)

    i++
  }
}

export function encode(n: bigint): Uint8Array {
  let _v: number[] = []
  const v = encodeToVec(n, _v)
  return new Uint8Array(v)
}

export function encodeToVec(n: bigint, v: number[]): number[] {
  let out: number[] = new Array(19).fill(0)
  let i = 18

  out[i] = bigintToLEBytes(n)[0] & 0b0111_1111

  while (n > BigInt(0x7f)) {
    n = n / BigInt(128) - BigInt(1)
    i -= 1
    out[i] = bigintToLEBytes(n)[0] | 0b1000_0000
  }

  v.push(...out.slice(i))
  return v
}

export function bigintToLEBytes(bn: bigint) {
  const byteSize = Math.ceil(bn.toString(2).length / 8)
  const bytes = new Uint8Array(byteSize)

  for (let i = 0; i < byteSize; i++) {
    bytes[i] = Number(bn & BigInt(0xff))
    bn >>= BigInt(8)
  }

  return bytes
}

export function decode2Commitment(buffer: Uint8Array): [bigint, number] {
  let n: bigint = BigInt(0)
  let i = 0
  console.log(buffer)
  while (true) {
    console.log("iteration:", i, buffer[i])
    if (i > 18) {
      throw new Error("Varint decoding error: OverLong")
    }
    if (i >= buffer.length) {
      throw new Error("Varint decoding error: Buffer underflow")
    }
    const byte = buffer[i]
    if (i == 18 && (byte & 0b0111_1100) != 0) {
      throw new Error("Varint decoding error: Overflow")
    }
    console.log("N:", n)
    let value = BigInt(byte & 0b0111_1111)
    value = value << BigInt(7 * i)
    n |= value
    console.log("N:", n)
    if ((byte & 0b1000_0000) == 0) {
      console.log("finish")
      return [n, i + 1]
    }
    i++
  }
}
