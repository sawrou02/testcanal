import { IsOptional, IsString } from 'class-validator';

export class UpdateAbonneDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  tel1?: string;

  @IsOptional()
  @IsString()
  tel2?: string;

  @IsOptional()
  @IsString()
  formuleId?: string;

  @IsOptional()
  @IsString()
  pdvId?: string;

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
