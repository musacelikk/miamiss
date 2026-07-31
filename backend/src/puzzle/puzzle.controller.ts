import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { PuzzleWin, PuzzleWord, Role } from '../entities';
import { CouponsService } from '../coupons/coupons.service';
import { CurrentUser, JwtAuthGuard, OptionalJwtAuthGuard, Roles, RolesGuard, type AuthUser } from '../auth/guards';

class ClaimDto {
  @IsString()
  wordId: string;

  @IsString()
  answer: string;

  @IsString()
  @MinLength(8)
  sessionKey: string;
}

class WordDto {
  @IsString()
  @MinLength(2)
  word: string;

  @IsString()
  @MinLength(2)
  hint: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

const normalize = (s: string) =>
  s.trim().toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ');

const shuffle = (letters: string[]): string[] => {
  const arr = [...letters];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

@Controller()
export class PuzzleController {
  constructor(
    @InjectRepository(PuzzleWord) private readonly words: Repository<PuzzleWord>,
    @InjectRepository(PuzzleWin) private readonly wins: Repository<PuzzleWin>,
    private readonly coupons: CouponsService,
  ) {}

  /** Anasayfa bulmacasi: rastgele aktif kelime, harfleri karistirilmis halde. */
  @Get('puzzle')
  async random() {
    const actives = await this.words.find({ where: { isActive: true } });
    if (!actives.length) return { available: false };
    const word = actives[Math.floor(Math.random() * actives.length)];
    const normalized = normalize(word.word);
    return {
      available: true,
      wordId: word.id,
      hint: word.hint,
      length: normalized.replace(/ /g, '').length,
      letters: shuffle(normalized.replace(/ /g, '').split('')),
    };
  }

  @Post('puzzle/claim')
  @UseGuards(OptionalJwtAuthGuard)
  async claim(
    @Body() dto: ClaimDto,
    @CurrentUser() user: AuthUser | null,
    @Ip() ip: string,
  ) {
    const word = await this.words.findOne({ where: { id: dto.wordId, isActive: true } });
    if (!word) throw new BadRequestException('Bulmaca bulunamadı.');
    if (normalize(dto.answer) !== normalize(word.word)) {
      throw new BadRequestException('Cevap yanlış, tekrar dene!');
    }

    // Tarayici verisi (sessionKey) silinerek tekrar kazanilmasin diye IP de kontrol edilir
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const already = await this.wins.findOne({
      where: [
        { sessionKey: dto.sessionKey, createdAt: MoreThan(monthAgo) },
        ...(ip ? [{ ipAddress: ip, createdAt: MoreThan(monthAgo) }] : []),
        ...(user ? [{ userId: user.id, createdAt: MoreThan(monthAgo) }] : []),
      ],
    });
    if (already) {
      throw new BadRequestException('Bu ay zaten bir indirim kodu kazandınız.');
    }

    const coupon = await this.coupons.createPuzzleReward();
    await this.wins.save(
      this.wins.create({
        sessionKey: dto.sessionKey,
        ipAddress: ip || null,
        userId: user?.id ?? null,
        wordId: word.id,
        couponId: coupon.id,
      }),
    );
    return {
      code: coupon.code,
      value: coupon.value,
      expiresAt: coupon.expiresAt,
      message: 'Tebrikler! %10 indirim kodunuz hazır.',
    };
  }

  @Get('admin/puzzle-words')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list() {
    return this.words.find({ order: { word: 'ASC' } });
  }

  @Post('admin/puzzle-words')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: WordDto) {
    return this.words.save(this.words.create(dto));
  }

  @Patch('admin/puzzle-words/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: WordDto) {
    const word = await this.words.findOne({ where: { id } });
    if (!word) throw new NotFoundException('Kelime bulunamadı.');
    Object.assign(word, dto);
    return this.words.save(word);
  }

  @Delete('admin/puzzle-words/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    const result = await this.words.delete({ id });
    if (!result.affected) throw new NotFoundException('Kelime bulunamadı.');
    return { ok: true };
  }
}
