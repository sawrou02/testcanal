import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateMouvementDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  materiel: string;

  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @IsString()
  @IsNotEmpty()
  destinationId: string;

  @IsInt()
  @Min(1)
  quantite: number;

  @IsString()
  @IsNotEmpty()
  numBonLivraison: string;

  @IsString()
  @IsNotEmpty()
  date: string;
}
