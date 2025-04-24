import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ProfileSearchService } from './profile-search.service';
import { ProfileBodyDto, ProfileSearchDto } from './dto/profile.dto';
import { ApiKeyGuard } from 'src/gurds/api-key.guard';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
@Controller('profile-search')
export class ProfileSearchController {
  constructor(private readonly profileSearchService: ProfileSearchService,
    private readonly configService: ConfigService,
  ) { }



  @Post('find')
  @UseGuards(ApiKeyGuard)
  async findProfile(
    @Body() profileBodyDto: ProfileBodyDto,

  ) {

    console.log("data received")
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


