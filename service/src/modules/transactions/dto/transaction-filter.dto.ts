import { Transform } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

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

  @IsOptional()
  text?: string;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortOrder?: string;

  @IsOptional()
  runeId?: string;

  @IsOptional()
  address?: string;
}
