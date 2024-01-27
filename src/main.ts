import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClusterService } from './cluster/cluster.service';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(8899);
  console.log(`Worker ${process.pid} started`);
}
ClusterService.clusterize(bootstrap);
