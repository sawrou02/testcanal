import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SecurityService } from '../security/security.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly security: SecurityService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    if (user.statut === 'INACTIF') {
      throw new UnauthorizedException('Compte désactivé');
    }

    const { passwordHash, ...userWithoutHash } = user;
    return userWithoutHash;
  }

  async login(
    email: string,
    password: string,
    ip = '',
    captcha?: { id?: string; answer?: string },
  ) {
    // 1) Compte bloqué (trop d'échecs récents) ?
    if (await this.security.isLocked(email)) {
      await this.security.log('LOGIN_LOCKED', email, ip, 'Tentative sur compte bloqué');
      throw new HttpException(
        { message: 'Compte temporairement bloqué après trop d’échecs. Réessayez dans 15 minutes.', code: 'LOCKED' },
        423,
      );
    }

    // 2) Captcha exigé après plusieurs échecs ?
    if (await this.security.needCaptcha(email)) {
      if (!this.security.verifyCaptcha(captcha?.id, captcha?.answer)) {
        throw new HttpException(
          { message: 'Vérification anti-robot requise.', code: 'CAPTCHA_REQUIRED' },
          401,
        );
      }
    }

    // 3) Vérification des identifiants
    let user: Awaited<ReturnType<AuthService['validateUser']>>;
    try {
      user = await this.validateUser(email, password);
    } catch (e) {
      await this.security.recordFailure(email, ip);
      throw e;
    }

    // 4) Succès → on journalise (ce LOGIN_OK remet le compteur d'échecs à zéro)
    await this.security.log('LOGIN_OK', email, ip);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getMe(userId: string) {
    return this.usersService.findById(userId);
  }
}
