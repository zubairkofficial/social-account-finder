import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ProfileSearchService } from './profile-search.service';
import { ProfileBodyDto, ProfileSearchDto } from './dto/profile.dto';
import { ApiKeyGuard } from 'src/gurds/api-key.guard';

@Controller('profile-search')
export class ProfileSearchController {
  constructor(private readonly profileSearchService: ProfileSearchService) { }



  @Post('find')
  @UseGuards(ApiKeyGuard)
  async findProfile(
    @Body() profileBodyDto: ProfileBodyDto,

  ) {
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
    // return await this.profileSearchService.findLinkedProfile(name, email, city, state);
    return await this.profileSearchService.getUserSocial(data);
  }
}


