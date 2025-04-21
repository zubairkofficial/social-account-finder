import { Test, TestingModule } from '@nestjs/testing';
import { ProfileSearchController } from './profile-search.controller';

describe('ProfileSearchController', () => {
  let controller: ProfileSearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileSearchController],
    }).compile();

    controller = module.get<ProfileSearchController>(ProfileSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
