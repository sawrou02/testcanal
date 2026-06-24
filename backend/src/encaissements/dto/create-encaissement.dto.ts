import {
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateEncaissementDto {
  @IsString()
  abonneId: string;

  @IsString()
  pdvId: string;

  @IsString()
  formuleId: string;

  @IsString()
  nature: string;

  @IsInt()
  @Min(1)
  nbMois: number;

  @IsString()
  modePaiement: string;

  @IsNumber()
  @Min(0)
  montantRecu: number;

  @IsOptional()
  @IsObject()
  options?: { premium?: boolean; intl?: boolean; timbre?: boolean };

  // ----- Champs additionnels (Lot Encaissement) -----
  /** Date de paiement saisie manuellement (sinon = date système). */
  @IsOptional()
  @IsString()
  datePaiement?: string;

  /** Numéro de contrat de l'abonné. */
  @IsOptional()
  @IsString()
  numeroContrat?: string;

  /** Date du prochain rendez-vous. */
  @IsOptional()
  @IsString()
  dateProchainRdv?: string;

  /** Deuxième numéro de téléphone de l'abonné. */
  @IsOptional()
  @IsString()
  tel2?: string;
}
