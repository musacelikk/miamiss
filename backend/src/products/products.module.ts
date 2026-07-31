import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category, Product, ProductImage, Review, StockAlert } from '../entities';
import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';
import { StockAlertsController } from './stock-alerts.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage, Category, Review, StockAlert])],
  controllers: [ProductsController, AdminProductsController, StockAlertsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
