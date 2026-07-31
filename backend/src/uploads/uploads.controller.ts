import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Role } from '../entities';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { StorageService } from './storage.service';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

@Controller('admin/uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Dosya bulunamadı.');
    const urls: string[] = [];
    for (const file of files) {
      if (!ALLOWED.includes(file.mimetype)) {
        throw new BadRequestException('Sadece JPEG, PNG, WebP veya AVIF yükleyebilirsiniz.');
      }
      urls.push(await this.storage.upload(file.buffer, file.originalname, file.mimetype));
    }
    return { urls };
  }
}
