import { IsString, IsNotEmpty } from 'class-validator';

export class RejeterDto {
  @IsString()
  @IsNotEmpty()
  motifRejet: string;
}
