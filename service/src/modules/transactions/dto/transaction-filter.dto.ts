import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class TransactionFilterDto {
  @Transform(({ value }) => {
    return +value;
  })
  @IsNumber()
  offset?: number = 1;

  @Transform(({ value }) => {
    return +value;
  })
  @IsNumber()
  limit?: number = 10;

  @Transform(({ value }) => {
    return !!value;
  })
  ignoreInvalid?: boolean = false;

  text?: string;

  sortBy?: string;

  sortOrder?: string;
}
