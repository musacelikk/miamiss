import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Role } from '../entities';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { StorageService } from './storage.service';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];
/** Anasayfa hero videosu icin ust sinir */
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

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

  /** Anasayfa hero videosu — S3/CloudFront'a `videos/` altina yuklenir. */
  @Post('video')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_VIDEO_BYTES } }))
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya bulunamadı.');
    if (!ALLOWED_VIDEO.includes(file.mimetype)) {
      throw new BadRequestException('Sadece MP4, WebM veya MOV video yükleyebilirsiniz.');
    }
    const url = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      'videos',
    );
    return { url };
  }
}

/** Iade talebi fotograflari icin herkese acik (siki limitli) yukleme ucu. */
@Controller('uploads')
export class PublicUploadsController {
  constructor(private readonly storage: StorageService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('returns')
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 8 * 1024 * 1024 } }))
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
