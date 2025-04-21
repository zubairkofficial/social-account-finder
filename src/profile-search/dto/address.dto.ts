
// address.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class AddressDto {
 
  @IsString()
  city?: string;

  @IsString()
  state?: string;

  @IsString()
  country?: string;
}
