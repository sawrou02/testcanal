import { IsOptional, IsString } from 'class-validator';

export class CreateAbonneDto {
  @IsOptional()
  @IsString()
  numAbonne?: string;

  @IsString()
  nom: string;

  @IsString()
  prenom: string;

  @IsString()
  tel1: string;

  @IsOptional()
  @IsString()
  tel2?: string;

  @IsString()
  formuleId: string;

  @IsString()
  pdvId: string;

  @IsOptional()
  @IsString()
  decodeurId?: string;

  @IsOptional()
  @IsString()
  dateEcheance?: string;

  @IsOptional()
  @IsString()
  statut?: string;
}
