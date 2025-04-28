import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ProfileSearchService } from './profile-search.service';
import { ProfileBodyDto } from './dto/profile.dto';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ApiOperation, ApiResponse, ApiBody, ApiTags } from '@nestjs/swagger';
import axios from 'axios';
import { VerifyWebhook } from 'src/gurds/verify-webhook.guard';

@ApiTags('Order Social Data Integration')
@Controller('profile-search')
export class ProfileSearchController {
  private pendingRequests = new Map<string, any>();

  constructor(
    private readonly profileSearchService: ProfileSearchService,
    private readonly configService: ConfigService,
  ) { }

  @Post('generate-order-id')
  // @UseGuards(VerifyWebhook)
  @ApiOperation({ summary: 'Generate order ID for social data tracking' })
  @ApiResponse({
    status: 200,
    description: 'Order ID generated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        success: { type: 'boolean', example: true },
        timestamp: { type: 'string', example: '2023-05-20T12:34:56.789Z' }
      }
    }
  })
  async generateOrderId(
    @Body() orderData: any,
    @Res() res: any
  ) {
    try {


      const customerInfo: ProfileBodyDto = {
        email: orderData?.customer?.email,
        name: orderData?.customer?.first_name + ' ' + orderData?.customer?.last_name,
        city: orderData?.customer?.default_address?.city,
        state: orderData?.customer?.default_address?.province,
        country: orderData?.customer?.default_address?.country,
        company: orderData?.customer?.default_address?.company,
      }


      console.log("data", customerInfo)
      // 1. Generate ID immediately
      const orderId = uuidv4();

      // 2. Store data temporarily
      this.pendingRequests.set(orderId, {
        customerData: orderData,
        createdAt: new Date()
      });

      // 3. Respond within 500ms
      res.status(200).json({
        id: orderId,
        success: true,
        timestamp: new Date().toISOString()
      });

      // 4. Process in background
      this.processSocialData(orderId, orderData);

    } catch (error) {
      console.error('Order ID generation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Order processing failed'
      });
    }
  }

  private async processSocialData(orderId: string, orderData: ProfileBodyDto) {
    try {
      // 1. Get stored data
      // const { customerData } = this.pendingRequests.get(orderId);

      // 2. Convert to search format
      const searchPayload = {
        name: orderData?.name,
        email: orderData?.email,
        company: orderData?.company,
        address: {
          city: orderData?.city,
          state: orderData?.state,
          country: orderData?.country,
        }
      };

      // 3. Fetch social data
      const socialData = await this.profileSearchService.getUserSocial(searchPayload);

      // 4. Prepare webhook payload
      const webhookPayload = {
        id: orderId,
        email: orderData.email,
        name: orderData.name,
        city: orderData.city,
        state: orderData.state,
        createdAt: new Date(),
        ...this.transformSocialData(socialData),
        processedAt: new Date().toISOString()
      };

      console.log("webhookPayload====", webhookPayload)

      // 5. Get webhook URL from config

      const webhookUrl = await this.configService.get<any>('SHOPIFY_WEBHOOK_URL');
      // 6. Send to webhook

      const res = await axios.post(webhookUrl, webhookPayload);

      console.log("response of webhok", res, webhookUrl)

      // 7. Cleanup
      this.pendingRequests.delete(orderId);
    } catch (error) {
      console.error(`Order ${orderId} processing failed:`, error);
      return { success: false, messsage: "Error sending data to Shopify" }

    }
  }
  private transformSocialData(socialData: any) {
    return {
      foundAt: new Date().toISOString(),
      lastUpdatedInstagram: new Date().toISOString(),
      profileDoneLinkedin: new Date().toISOString(),
      socials: [socialData.linkedin ? 'linkedin' : null, socialData.instagram ? 'instagram' : null]
        .filter(Boolean).join(','),
      linkedin: socialData.linkedin?.linkedInURL || '',
      instagram: socialData.instagram?.instagramURL || '',
      emailMatchedLinkedin: socialData.linkedin?.email_matched || false,
      emailMatchedInstagram: socialData.instagram?.email_matched || false,
      confidenceIg: socialData.instagram?.confidence || 0,
      confidenceLi: socialData.linkedin?.confidence || 0,
      bioInstagram: socialData.instagram?.bio || '',
      followersInstagram: socialData.instagram?.followers || 0,
      followingsInstagram: socialData.instagram?.followings || 0,
      mediasInstagram: socialData.instagram?.medias || 0,
      headlineLinkedin: socialData.linkedin?.headline || '',
      locationLinkedin: socialData.linkedin?.location || '',
      message: socialData.linkedin ? "Linkedin Completed." : "No Linkedin data"
    };
  }
}