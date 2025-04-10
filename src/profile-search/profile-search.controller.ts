import { Controller, Get, Query } from '@nestjs/common';
import { ProfileSearchService } from './profile-search.service';

@Controller('profile-search')
export class ProfileSearchController {
  constructor(private readonly profileSearchService: ProfileSearchService) {}

  @Get('find')
  async findProfile(
    @Query('name') name: string,
    @Query('email') email: string,
    @Query('city') city: string,
    @Query('state') state: string,
  ) {
    // return await this.profileSearchService.findLinkedProfile(name, email, city, state);
    return await this.profileSearchService.findLinkedProfile();
  }
}
