import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProfileSearchService } from './profile-search/profile-search.service';
import { ProfileSearchController } from './profile-search/profile-search.controller';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyGuard } from './gurds/api-key.guard';

@Module({
  imports: [ ConfigModule.forRoot({
    isGlobal: true, // Makes the config globally available
  }),],
  controllers: [AppController, ProfileSearchController],
  providers: [AppService, ProfileSearchService, ApiKeyGuard],
})
export class AppModule { }
