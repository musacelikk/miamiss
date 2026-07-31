import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

/**
 * AWS_* env degiskenleri doluysa S3'e (CloudFront URL'i ile) yukler,
 * bos ise backend/uploads altina lokal diske yazar.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null = null;
  private readonly bucket: string | null = null;
  private readonly publicBase: string;

  constructor(private readonly config: ConfigService) {
    const region = config.get<string>('AWS_REGION');
    const bucket = config.get<string>('S3_BUCKET');
    const key = config.get<string>('AWS_ACCESS_KEY_ID');
    if (region && bucket && key) {
      this.s3 = new S3Client({ region });
      this.bucket = bucket;
      this.publicBase =
        config.get<string>('CLOUDFRONT_URL')?.replace(/\/$/, '') ??
        `https://${bucket}.s3.${region}.amazonaws.com`;
      this.logger.log(`Depolama: S3 (${bucket})`);
    } else {
      const port = config.get<string>('PORT') ?? '4000';
      this.publicBase =
        config.get<string>('PUBLIC_URL')?.replace(/\/$/, '') ?? `http://localhost:${port}`;
      this.logger.log('Depolama: lokal disk (uploads/)');
    }
  }

  async upload(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    const ext = (originalName.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const name = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;

    if (this.s3 && this.bucket) {
      const key = `products/${name}`;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      return `${this.publicBase}/${key}`;
    }

    const dir = join(process.cwd(), 'uploads', 'products');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), buffer);
    return `${this.publicBase}/uploads/products/${name}`;
  }
}
