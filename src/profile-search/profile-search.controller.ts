import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ProfileSearchService } from './profile-search.service';
import { ProfileBodyDto, ProfileSearchDto } from './dto/profile.dto';
import { ApiKeyGuard } from 'src/gurds/api-key.guard';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { VerifyWebhook } from 'src/gurds/verify-webhook.guard';
import Shopify from '@shopify/shopify-api';

@Controller('profile-search')
export class ProfileSearchController {
  constructor(private readonly profileSearchService: ProfileSearchService,
    private readonly configService: ConfigService,
  ) { }


  // Define the endpoint to receive the webhook from Shopify
  // @UseGuards(VerifyWebhook)  // Ensure HMAC verification is performed
  // @Post('/')
  // async handleShopifyWebhook(
  //   @Req() req: any,  // Access the raw body of the request
  //   @Res() res: any,        // Response object to send the status back
  // ) {
  //   const topic = req.headers['X-Shopify-Topic'] as string;
  //   const domain = req.headers['X-Shopify-Shop-Domain'] as string;

  //   if (!req.rawBody) {
  //     return res.status(400).send('Raw body not found');
  //   }

  //   if (!domain || !topic) {
  //     return res.status(400).send('Invalid webhook data');
  //   }

  //   // Get the handler for the specific webhook topic (like CHECKOUT_CREATE, APP_UNINSTALLED, etc.)
  //   const webhookHandler = Shopify.Webhooks.Registry.getHandler(topic.toUpperCase());

  //   if (!webhookHandler) {
  //     return res.status(404).send('No handler found for this topic');
  //   }

  //   try {
  //     // Process the webhook with the handler
  //     await webhookHandler(req.rawBody.toString(), domain, req.body);
  //     return res.status(200).send('Webhook successfully processed');
  //   } catch (error) {
  //     console.error('Error processing Shopify webhook:', error);
  //     return res.status(500).send('Error processing webhook');
  //   }
  // }


  @Post('find')
  // @UseGuards(ApiKeyGuard)
  async findProfile(
    @Body() profileBodyDto: ProfileBodyDto,
    @Req() req: any,  // Access the raw body of the request
    @Res() res: any,        // Response object to send the status back

  ) {
    const topic = req.headers['X-Shopify-Topic'] as string;
    const domain = req.headers['X-Shopify-Shop-Domain'] as string;
    console.log("data received", topic, domain, req);
    const data: ProfileSearchDto = {
      name: profileBodyDto?.name,
      email: profileBodyDto?.email,
      company: profileBodyDto?.company,
      address: {
        city: profileBodyDto?.city,
        state: profileBodyDto?.state,
        country: profileBodyDto?.country,
      }
    }
    // Step 1: Process the data as required (you are already doing this)
    const processedData = await this.profileSearchService.getUserSocial(data);

    // Step 2: Send the processed data back to Shopify via webhook endpoint
    const shopifyWebhookUrl = this.configService.get<any>('SHOPIFY_WEBHOOK_URL'); // Replace with the actual Shopify webhook URL

    try {
      const response = await axios.post(shopifyWebhookUrl, processedData);
      console.log('Data sent to Shopify:', response.data);
      return { success: true, message: 'Data successfully sent to Shopify.' };
    } catch (error) {
      console.error('Error sending data to Shopify:', error);
      return { success: false, message: 'Error sending data to Shopify.' };
    }
  }
}


