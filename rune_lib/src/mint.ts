export interface IMint {
  deadline: bigint | null;
  limit: bigint | null;
  term: bigint | null;
}

export class Mint {
  constructor(
    public deadline: bigint | null,
    public limit: bigint | null,
    public term: bigint | null,
  ) {}

  static fromJson(json: IMint): Mint {
    return new Mint(json.deadline, json.limit, json.term);
  }

  static fromJsonString(str: string): Mint {
    const _obj = JSON.parse(str);
    return Mint.fromJson({
      deadline: _obj.deadline ? BigInt(_obj.deadline) : null,
      limit: _obj.limit ? BigInt(_obj.limit) : null,
      term: _obj.term ? BigInt(_obj.term) : null,
    });
  }

  public toJsonString(): string {
    return JSON.stringify({
      deadline: this.deadline?.toString(),
      limit: this.limit?.toString(),
      term: this.term?.toString(),
    });
  }
}
