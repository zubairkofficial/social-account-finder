import { Test, TestingModule } from '@nestjs/testing';
import { ProfileSearchService } from './profile-search.service';

describe('ProfileSearchService', () => {
  let service: ProfileSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfileSearchService],
    }).compile();

    service = module.get<ProfileSearchService>(ProfileSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
