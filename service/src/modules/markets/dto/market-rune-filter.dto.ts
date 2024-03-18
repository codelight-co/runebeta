import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class MarketRuneFilterDto {
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

  sortBy?: string;

  sortOrder?: string;

  search?: string;
}
