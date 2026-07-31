/**
 * TypeORM CLI icin veri kaynagi (migration uretme/calistirma).
 * Uygulama calisma zamani app.module.ts'teki yapilandirmayi kullanir.
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [join(__dirname, 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
