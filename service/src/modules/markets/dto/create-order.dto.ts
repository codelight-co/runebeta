import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  @Transform(({ value }) => {
    return +value;
  })
  readonly price: number; // satoshi

  @IsString()
  readonly runeId: number;

  @IsNumber()
  @Transform(({ value }) => {
    return +value;
  })
  amount: number;

  @IsString()
  @IsNotEmpty()
  signedTx: string;
}
