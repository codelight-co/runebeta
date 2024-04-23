import { IsArray } from 'class-validator';

export class RetrieveRuneDto {
  @IsArray()
  tx_locations: Array<string>;
}
