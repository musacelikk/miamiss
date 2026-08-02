import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { CurrentUser, JwtAuthGuard, type AuthUser } from './guards';

class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  code: string;

  @IsString()
  @MinLength(6)
  password: string;
}

const googleEnabled = () =>
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /* Kaba kuvvet korumasi: bu uclarda dakikada 8 deneme (IP basina) */

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.email, dto.code, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user!.id);
  }

  @Get('google/enabled')
  googleStatus() {
    return { enabled: googleEnabled() };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  google() {
    if (!googleEnabled()) throw new NotFoundException();
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: { user: { googleId: string; email: string; name: string } },
    @Res() res: Response,
  ) {
    const { token } = await this.auth.googleLogin(req.user);
    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    res.redirect(`${frontend}/giris/google?token=${encodeURIComponent(token)}`);
  }
}
