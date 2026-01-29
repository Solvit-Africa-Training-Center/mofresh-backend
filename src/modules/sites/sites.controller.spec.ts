import { Test, TestingModule } from '@nestjs/testing';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
import { PrismaService } from '@/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SitesController', () => {
  let controller: SitesController;
  let service: SitesService;

  const mockSite = {
    id: 'uuid',
    name: 'Test Site',
    location: 'Test Location',
    managerId: 'manager-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };


  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SitesController],
      providers: [
        SitesService,
        {
          provide: PrismaService,
          useValue: {
            site: {
              create: jest.fn().mockResolvedValue(mockSite),
              findMany: jest.fn().mockResolvedValue([mockSite]),
              findUnique: jest.fn().mockResolvedValue(mockSite),
              update: jest.fn().mockResolvedValue(mockSite),
              delete: jest.fn().mockResolvedValue(mockSite),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<SitesController>(SitesController);
    service = module.get<SitesService>(SitesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a site', async () => {
    const createSiteDto = { name: 'New Site', location: 'New Location' };
    const result = await controller.create(createSiteDto);
    expect(result.status).toBe('success');
    expect(result.message).toBe('Site created successfully');
    expect(result.data).toEqual(mockSite);
  });

  it('should return all sites', async () => {
    const result = await controller.findAll();
    expect(result.status).toBe('success');
    expect(result.message).toBe('Successfully retrieved all sites.');
    expect(result.data).toEqual([mockSite]);
  });

  it('should return a site by ID', async () => {
    const result = await controller.findOne('uuid');
    expect(result.status).toBe('success');
    expect(result.message).toBe('Successfully retrieved site with ID uuid');
    expect(result.data).toEqual(mockSite);
  });

  it('should throw NotFoundException if site is not found by ID', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(null);  
    try {
      await controller.findOne('non-existing-id');
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundException);
      expect(e.message).toBe('Site with ID non-existing-id not found.');
    }
  });

  it('should update a site', async () => {
    const updateDto = { name: 'Updated Site' };
    const result = await controller.update('uuid', updateDto);
    expect(result.status).toBe('success');
    expect(result.message).toBe('Site with ID uuid has been successfully updated.');
    expect(result.data).toEqual(mockSite);
  });

  it('should throw NotFoundException if site not found during update', async () => {
    jest.spyOn(service, 'update').mockResolvedValue(null);  // Mocking site not found during update
    try {
      await controller.update('non-existing-id', { name: 'Updated Site' });
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundException);
      expect(e.message).toBe('Site with ID non-existing-id not found.');
    }
  });

  it('should delete a site', async () => {
    const result = await controller.remove('uuid');
    expect(result.status).toBe('success');
    expect(result.message).toBe('Site with ID uuid has been successfully deleted.');
  });

  it('should throw NotFoundException if site not found during deletion', async () => {
    jest.spyOn(service, 'remove').mockResolvedValue(null); 
    try {
      await controller.remove('non-existing-id');
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundException);
      expect(e.message).toBe('Site with ID non-existing-id not found.');
    }
  });
});
