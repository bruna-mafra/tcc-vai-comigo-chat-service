import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger } from '@shared/logger/app.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger(),
  });

  const port = process.env.APP_PORT || 3001;

  await app.listen(port, () => {
    console.log(`Chat Service running on port ${port}`);
  });
}

bootstrap();
