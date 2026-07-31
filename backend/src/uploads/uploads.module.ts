import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { PublicUploadsController, UploadsController } from './uploads.controller';

@Module({
  providers: [StorageService],
  controllers: [UploadsController, PublicUploadsController],
  exports: [StorageService],
})
export class UploadsModule {}
