import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PuzzleWin, PuzzleWord } from '../entities';
import { CouponsModule } from '../coupons/coupons.module';
import { PuzzleController } from './puzzle.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PuzzleWord, PuzzleWin]), CouponsModule],
  controllers: [PuzzleController],
})
export class PuzzleModule {}
