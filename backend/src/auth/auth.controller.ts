import { Controller, Post, Body, Get, UseGuards, Request, Req, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SecurityService } from '../security/security.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IsOptional, IsString } from 'class-validator';

class LoginDto {
  @IsString()
  email: string;

  @IsString()
  password: string;

  @IsOptional() @IsString()
  captchaId?: string;

  @IsOptional() @IsString()
  captchaAnswer?: string;
}

function clientIp(req: any): string {
  return String(req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '');
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly security: SecurityService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto.email, dto.password, clientIp(req), {
      id: dto.captchaId,
      answer: dto.captchaAnswer,
    });
  }

  @Get('captcha')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  captcha() {
    return this.security.issueCaptcha();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: { user: { userId: string } }) {
    return this.authService.getMe(req.user.userId);
  }
}
