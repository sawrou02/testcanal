import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReferentielsModule } from './referentiels/referentiels.module';
import { AbonnesModule } from './abonnes/abonnes.module';
import { EncaissementsModule } from './encaissements/encaissements.module';
import { AuditModule } from './audit/audit.module';
import { VersementsModule } from './versements/versements.module';
import { RetraitsModule } from './retraits/retraits.module';
import { OperationsBancairesModule } from './operations-bancaires/operations-bancaires.module';
import { RapportsModule } from './rapports/rapports.module';
import { CommissionsModule } from './commissions/commissions.module';
import { ServiceAbonnementModule } from './service-abonnement/service-abonnement.module';
import { LogistiqueModule } from './logistique/logistique.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DepensesModule } from './depenses/depenses.module';
import { ObjectifsModule } from './objectifs/objectifs.module';
import { AccessoiresModule } from './accessoires/accessoires.module';
import { VadModule } from './vad/vad.module';
import { CreditModule } from './credit/credit.module';
import { ArretesModule } from './arretes/arretes.module';
import { InstallationsModule } from './installations/installations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { RetourRpeModule } from './retour-rpe/retour-rpe.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    DashboardModule,
    ReferentielsModule,
    AbonnesModule,
    EncaissementsModule,
    VersementsModule,
    RetraitsModule,
    OperationsBancairesModule,
    RapportsModule,
    CommissionsModule,
    ServiceAbonnementModule,
    LogistiqueModule,
    AnalyticsModule,
    DepensesModule,
    ObjectifsModule,
    AccessoiresModule,
    VadModule,
    CreditModule,
    ArretesModule,
    InstallationsModule,
    NotificationsModule,
    SearchModule,
    RetourRpeModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
