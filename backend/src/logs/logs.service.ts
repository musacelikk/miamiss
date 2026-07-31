import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../entities';

export type ActivityLogInput = {
  userId?: string | null;
  email?: string | null;
  actorType?: string;
  action: string;
  detail?: string | null;
};

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly logs: Repository<ActivityLog>,
  ) {}

  record(input: ActivityLogInput): void {
    void this.logs
      .save(
        this.logs.create({
          userId: input.userId ?? null,
          email: input.email ?? null,
          actorType: input.actorType ?? 'GUEST',
          action: input.action,
          detail: input.detail ?? null,
        }),
      )
      .catch((err: unknown) => {
        this.logger.warn(`Activity log kaydedilemedi: ${String(err)}`);
      });
  }

  async findAdmin(params: {
    actorType?: string;
    search?: string;
    page?: number;
    take?: number;
  }) {
    const take = params.take ?? 50;
    const page = Math.max(1, params.page ?? 1);
    const qb = this.logs.createQueryBuilder('l').orderBy('l.createdAt', 'DESC');

    if (params.actorType) {
      qb.andWhere('l.actorType = :actorType', { actorType: params.actorType });
    }
    if (params.search?.trim()) {
      qb.andWhere('(l.email ILIKE :s OR l.action ILIKE :s OR l.detail ILIKE :s)', {
        s: `%${params.search.trim()}%`,
      });
    }

    const [items, total] = await qb
      .skip((page - 1) * take)
      .take(take)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageCount: Math.max(1, Math.ceil(total / take)),
    };
  }
}
