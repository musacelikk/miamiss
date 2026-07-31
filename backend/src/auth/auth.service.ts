import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role, User } from '../entities';
import { LogsService } from '../logs/logs.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly logs: LogsService,
  ) {}

  private logAuth(user: User, action: string, detail?: string) {
    this.logs.record({
      userId: user.id,
      email: user.email,
      actorType: user.role === Role.ADMIN ? 'ADMIN' : 'CUSTOMER',
      action,
      detail,
    });
  }

  private sign(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return this.jwt.sign(payload);
  }

  private publicUser(user: User) {
    const { passwordHash: _ph, ...rest } = user as User & { passwordHash?: string | null };
    return rest;
  }

  async register(data: { name: string; email: string; password: string; phone?: string }) {
    const email = data.email.trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) throw new BadRequestException('Bu e-posta adresi zaten kayıtlı.');

    const user = this.users.create({
      email,
      name: data.name.trim(),
      phone: data.phone ?? null,
      passwordHash: await bcrypt.hash(data.password, 10),
    });
    await this.users.save(user);
    this.logAuth(user, 'auth.register', 'Yeni üyelik oluşturuldu');
    return { token: this.sign(user), user: this.publicUser(user) };
  }

  async login(email: string, password: string) {
    const user = await this.users.findOne({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user?.passwordHash) throw new UnauthorizedException('E-posta veya şifre hatalı.');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('E-posta veya şifre hatalı.');
    this.logAuth(user, 'auth.login', 'Giriş yapıldı');
    return { token: this.sign(user), user: this.publicUser(user) };
  }

  async googleLogin(profile: { googleId: string; email: string; name: string }) {
    let user = await this.users.findOne({ where: { googleId: profile.googleId } });
    if (!user) {
      user = await this.users.findOne({ where: { email: profile.email.toLowerCase() } });
      if (user) {
        user.googleId = profile.googleId;
      } else {
        user = this.users.create({
          email: profile.email.toLowerCase(),
          name: profile.name,
          googleId: profile.googleId,
          passwordHash: null,
        });
      }
      await this.users.save(user);
    }
    this.logAuth(user, 'auth.login', 'Google ile giriş yapıldı');
    return { token: this.sign(user), user: this.publicUser(user) };
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }
}
