import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module'; // Đảm bảo đúng đường dẫn tới AppModule
import { initDataSeed } from './init-data.seed';

async function run() {
  // Khởi tạo context của Nest để lấy được kết nối database hiện có
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('🚀 Đang bắt đầu seed dữ liệu...');
    await initDataSeed(dataSource);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
  } finally {
    await app.close();
  }
}

run();