import { IsString } from 'class-validator';

export class VerifyDto {
  @IsString()
  signature: string;

  @IsString()
  address: string;
}
