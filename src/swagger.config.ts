import { DocumentBuilder } from '@nestjs/swagger';

export const config = new DocumentBuilder()
  .setTitle('Order Social Data API')
  .setDescription('Integration between Shopify orders and social data')
  .setVersion('1.0')
  .addTag('orders')
  .build();