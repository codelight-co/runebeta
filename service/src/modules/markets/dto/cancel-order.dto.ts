import { IsNotEmpty } from 'class-validator';

export class CancelOrderDto {
  @IsNotEmpty()
  orderIds: number[];
}
