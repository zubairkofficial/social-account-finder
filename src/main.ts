import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import bodyParser from 'body-parser';
import { config } from './swagger.config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Enable webhook raw body
  // app.use(bodyParser.json({
  //   verify: (req: any, res, buf) => {
  //     req.rawBody = buf;
  //   }
  // }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
