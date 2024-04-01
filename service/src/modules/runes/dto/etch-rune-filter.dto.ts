import {} from 'class-transformer';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class EtchRuneDto {
  @IsNotEmpty()
  commitTxId: string;

  @IsNotEmpty()
  revealTxRawHex: string;

  @IsNotEmpty()
  commitBlockHeight: number;

  @IsOptional()
  runeName: string;
}
