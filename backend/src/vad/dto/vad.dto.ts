import { IsInt, IsNumber, IsString, Min } from 'class-validator';

export class LivraisonVadDto {
  @IsString()
  vadPdvId: string;

  @IsString()
  type: string; // DecodeurType

  @IsInt()
  @Min(1)
  quantite: number;
}

export class VenteKitDto {
  @IsString()
  vadPdvId: string;

  @IsString()
  decodeurType: string; // DecodeurType

  @IsString()
  clientNom: string;

  @IsNumber()
  @Min(0)
  montant: number;
}
