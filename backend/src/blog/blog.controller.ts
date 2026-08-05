import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { BlogPost, Role } from '../entities';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type AuthUser } from '../auth/guards';
import { slugify } from '../products/admin-products.controller';
import { LogsService } from '../logs/logs.service';

class BlogPostDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(['TEXT', 'MARKDOWN', 'HTML'])
  format?: 'TEXT' | 'MARKDOWN' | 'HTML';

  @IsOptional()
  @IsString()
  coverImage?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

@Controller()
export class BlogController {
  constructor(
    @InjectRepository(BlogPost) private readonly posts: Repository<BlogPost>,
    private readonly logs: LogsService,
  ) {}

  @Get('blog')
  list() {
    return this.posts.find({
      where: { isPublished: true },
      order: { publishedAt: 'DESC' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
      },
      take: 50,
    });
  }

  @Get('blog/:slug')
  async bySlug(@Param('slug') slug: string) {
    const post = await this.posts.findOne({ where: { slug, isPublished: true } });
    if (!post) throw new NotFoundException('Yazı bulunamadı.');
    return post;
  }

  @Get('admin/blog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminList() {
    return this.posts.find({ order: { createdAt: 'DESC' } });
  }

  @Post('admin/blog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: BlogPostDto, @CurrentUser() admin: AuthUser) {
    let slug = slugify(dto.title);
    if (await this.posts.findOne({ where: { slug } })) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'blog.create',
      detail: `Blog yazısı eklendi: ${dto.title}`,
    });
    return this.posts.save(
      this.posts.create({
        ...dto,
        slug,
        coverImage: dto.coverImage ?? null,
        publishedAt: dto.isPublished ? new Date() : null,
      }),
    );
  }

  @Patch('admin/blog/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: BlogPostDto,
    @CurrentUser() admin: AuthUser,
  ) {
    const post = await this.posts.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Yazı bulunamadı.');
    const publishingNow = dto.isPublished && !post.isPublished;
    Object.assign(post, dto, { coverImage: dto.coverImage ?? post.coverImage });
    if (publishingNow) post.publishedAt = new Date();
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'blog.update',
      detail: `Blog yazısı güncellendi: ${post.title}`,
    });
    return this.posts.save(post);
  }

  @Delete('admin/blog/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    const post = await this.posts.findOne({ where: { id } });
    const result = await this.posts.delete({ id });
    if (!result.affected) throw new NotFoundException('Yazı bulunamadı.');
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'blog.delete',
      detail: `Blog yazısı silindi: ${post?.title ?? id}`,
    });
    return { ok: true };
  }
}
