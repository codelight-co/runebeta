import { IsNotEmpty, IsString } from 'class-validator';

export class BroadcastTransactionDto {
  @IsNotEmpty()
  @IsString()
  rawTransaction: string;
}
