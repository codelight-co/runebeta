export interface ITerms {
  cap: bigint | null;
  height: [bigint | null, bigint | null] | null;
  limit: bigint | null;
  offset: [bigint | null, bigint | null] | null;
}

export class Terms {
  constructor(
    public cap: bigint | null,
    public height: (bigint | null)[] | null,
    public limit: bigint | null,
    public offset: (bigint | null)[] | null,
  ) {}
  static fromJson(json: ITerms): Terms {
    return new Terms(json.cap, json.height, json.limit, json.offset);
  }

  static fromJsonString(str: string): Terms {
    const _obj = JSON.parse(str);
    return Terms.fromJson({
      cap: _obj.cap ? BigInt(_obj.cap) : null,
      height: _obj.height ? [_obj.height[0] === null ? null : BigInt(_obj.height[0]), _obj.height[1] === null ? null : BigInt(_obj.height[1])] : null,
      limit: _obj.limit ? BigInt(_obj.limit) : null,
      offset: _obj.offset ? [_obj.offset[0] === null ? null : BigInt(_obj.offset[0]), _obj.offset[1] === null ? null : BigInt(_obj.height[1])] : null,
    });
  }
  toJsonString(): string {
    return JSON.stringify({
      cap: this.cap?.toString(),
      height: this.height?.toString(),
      limit: this.limit?.toString(),
      offset: this.offset?.toString(),
    });
  }
}
