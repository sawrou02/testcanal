import { ArgumentsHost, Catch, ExceptionFilter, ForbiddenException } from '@nestjs/common';
import { SecurityService } from './security.service';

/**
 * Journalise chaque « accès refusé » (403) : quelqu'un tente d'ouvrir une
 * ressource interdite pour son rôle. Utile pour repérer un compte suspect.
 */
@Catch(ForbiddenException)
export class AccessDeniedFilter implements ExceptionFilter {
  constructor(private security: SecurityService) {}

  async catch(exception: ForbiddenException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const user = req.user || {};
    const ident = user.email || user.userId || 'inconnu';
    const ip = req.ip || req.headers?.['x-forwarded-for'] || '';
    await this.security.log('ACCESS_DENIED', ident, String(ip), `${req.method} ${req.originalUrl || req.url}`);
    const status = exception.getStatus();
    res.status(status).json(exception.getResponse());
  }
}
