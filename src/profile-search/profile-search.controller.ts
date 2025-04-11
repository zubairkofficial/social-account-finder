import { Controller, Get, Query } from '@nestjs/common';
import { ProfileSearchService } from './profile-search.service';
import { ProfileSearchDto } from './dto/profile.dto';

@Controller('profile-search')
export class ProfileSearchController {
  constructor(private readonly profileSearchService: ProfileSearchService) { }



  @Get('find')
  async findProfile(
    @Query('name') name: string,
    @Query('email') email: string,
    @Query('company') company: string,
    @Query('city') city: string,
    @Query('state') state: string,
    @Query('country') country: string,
    @Query('address1') address1: string,
    @Query('address2') address2: string,
  ) {
    const data: ProfileSearchDto = {
      name,
      email,
      company,
      address: {
        city,
        state,
        country,
        address1,
        address2
      }
    }
    // return await this.profileSearchService.findLinkedProfile(name, email, city, state);
    return await this.profileSearchService.getLinkedProfile(data);
  }
}
