import { IsArray } from 'class-validator';

export class RetrieveRuneDto {
  @IsArray()
  tx_ids: Array<string>;
}
