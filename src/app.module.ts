import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProfileSearchService } from './profile-search/profile-search.service';
import { ProfileSearchController } from './profile-search/profile-search.controller';

@Module({
  imports: [],
  controllers: [AppController, ProfileSearchController],
  providers: [AppService, ProfileSearchService],
})
export class AppModule { }
