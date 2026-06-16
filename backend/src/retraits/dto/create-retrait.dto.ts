import {
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  Min,
} from 'class-validator';

export class CreateRetraitDto {
  @IsString()
  @IsNotEmpty()
  pdvId: string;

  @IsNumber()
  @Min(0)
  montant: number;

  @IsString()
  @IsNotEmpty()
  banqueId: string;

  @IsString()
  @IsNotEmpty()
  dateVersement: string;

  @IsString()
  @IsNotEmpty()
  periode: string;

  @IsString()
  @IsNotEmpty()
  libelle: string;

  @IsString()
  @IsNotEmpty()
  numBordereau: string;

  @IsOptional()
  @IsString()
  photoBordereau?: string;
}
