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

const googleEnabled = () =>
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
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
