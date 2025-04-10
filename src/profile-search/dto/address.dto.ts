
// address.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class AddressDto {
  @IsString()
  address1: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  country: string;
}
