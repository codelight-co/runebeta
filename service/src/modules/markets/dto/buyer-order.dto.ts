import { IsNotEmpty, IsNumber } from 'class-validator';
import { IRuneListingState } from 'src/common/handlers/runes/types';

export class BuyerOrderDto {
  @IsNotEmpty()
  buyerState: IRuneListingState;

  @IsNotEmpty()
  orderIds: number[];

  @IsNumber()
  feeRate: number;
}
