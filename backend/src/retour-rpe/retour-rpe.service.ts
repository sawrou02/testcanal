import { Injectable } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CreateRetourRpeDto {
  @IsString() numAbonne: string;
  @IsString() nom: string;
  @IsString() prenom: string;
  @IsOptional() @IsString() tel?: string;
  @IsOptional() @IsString() formule?: string;
  @IsOptional() @IsString() pdv?: string;
  @IsOptional() @IsString() agent?: string;
}

export class UpdateRetourRpeDto {
  @IsOptional() @IsString() joint?: string;
  @IsOptional() @IsString() installation?: string;
  @IsOptional() @IsString() satisfaction?: string;
  @IsOptional() @IsString() mycanal?: string;
  @IsOptional() @IsString() netflix?: string;
  @IsOptional() @IsString() progrFidel?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10) score?: number;
  @IsOptional() @IsString() commentaire?: string;
  @IsOptional() @IsString() statut?: string;
}

@Injectable()
export class RetourRpeService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.retourRpe.findMany({ orderBy: { date: 'desc' }, take: 500 }); }
  create(dto: CreateRetourRpeDto) { return this.prisma.retourRpe.create({ data: dto as any }); }
  update(id: string, dto: UpdateRetourRpeDto) { return this.prisma.retourRpe.update({ where: { id }, data: dto as any }); }
  remove(id: string) { return this.prisma.retourRpe.delete({ where: { id } }); }
}
