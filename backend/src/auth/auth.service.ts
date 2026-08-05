import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { MoreThan } from 'typeorm';
import { Role, User } from '../entities';
import { LogsService } from '../logs/logs.service';
import { MailService } from '../mail/mail.service';

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
    private readonly mail: MailService,
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
    this.mail.newUserAdmin({ name: user.name, email: user.email });
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
        this.mail.newUserAdmin({ name: profile.name, email: profile.email, via: 'Google' });
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

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Sifre sifirlama talebi: e-postaya 5 dakika gecerli 6 haneli kod gider.
   * Hesabin var olup olmadigini sizdirmamak icin her durumda ayni yanit doner.
   */
  async requestPasswordReset(email: string): Promise<{ ok: true }> {
    const user = await this.users.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    // Google ile kayitli (passwordHash null) hesaplar da bu yolla sifre belirleyebilir
    if (user) {
      const code = String(randomBytes(4).readUInt32BE(0) % 900000 + 100000);
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 5);
      await this.users.update(
        { id: user.id },
        { resetTokenHash: this.hashToken(code), resetTokenExpiresAt: expires },
      );
      this.mail.passwordResetCode(user.email, user.name.split(' ')[0], code);
      this.logAuth(user, 'auth.reset_request', 'Şifre sıfırlama kodu gönderildi');
    }
    return { ok: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.users.findOne({
      where: {
        email: email.trim().toLowerCase(),
        resetTokenHash: this.hashToken(code.trim()),
        resetTokenExpiresAt: MoreThan(new Date()),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        resetTokenHash: true,
      },
    });
    if (!user) {
      throw new BadRequestException(
        'Kod hatalı veya süresi dolmuş. Yeni bir kod talep edebilirsiniz.',
      );
    }
    await this.users.update(
      { id: user.id },
      {
        passwordHash: await bcrypt.hash(newPassword, 10),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    );
    this.logAuth(user, 'auth.reset_done', 'Şifre kod ile sıfırlandı');
    return { token: this.sign(user), user: this.publicUser(user) };
  }
}
