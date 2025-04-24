// src/guards/verify-webhook.guard.ts

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
// import { RawBodyRequest } from 'src/interfaces/raw-body-request.interface';

@Injectable()
export class VerifyWebhook implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<any>();
    const hmacHeader = req.headers['X-Shopify-Hmac-Sha256'] as string;

    if (!hmacHeader || typeof hmacHeader !== 'string') {
      throw new UnauthorizedException('Missing HMAC header');
    }

    if (!req.rawBody) {
      throw new UnauthorizedException('Raw body not found');
    }

    const generatedHash = createHmac('sha256', 'your-shopify-secret')  // Replace with your Shopify secret
      .update(req.rawBody)
      .digest('base64');

    const hmacBuffer = Buffer.from(hmacHeader, 'base64');
    const generatedHashBuffer = Buffer.from(generatedHash, 'base64');

    if (!timingSafeEqual(generatedHashBuffer, hmacBuffer)) {
      throw new UnauthorizedException('HMAC verification failed');
    }

    return true;
  }
}
