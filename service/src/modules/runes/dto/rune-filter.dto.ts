import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class RuneFilterDto {
  @Transform(({ value }) => {
    return +value;
  })
  @IsNumber()
  offset?: number = 0;

  @Transform(({ value }) => {
    return +value;
  })
  @IsNumber()
  limit?: number = 10;

  @Transform(({ value }) => {
    return !!value;
  })
  ignoreInvalid?: boolean = false;

  type?: string;

  sortBy?: string;

  sortOrder?: string;

  search?: string;
}
