import { Test, TestingModule } from '@nestjs/testing';
import { SitesService } from './sites.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SitesService', () => {
  let service: SitesService;
  let prisma: PrismaService;

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

    service = module.get<SitesService>(SitesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a site', async () => {
    const createDto = { name: 'New Site', location: 'New Location' };
    const result = await service.create(createDto);
    expect(result).toEqual(mockSite);
    expect(prisma.site.create).toHaveBeenCalledWith({ data: createDto });
  });

  it('should find all sites', async () => {
    const result = await service.findAll();
    expect(result).toEqual([mockSite]);
    expect(prisma.site.findMany).toHaveBeenCalled();
  });

  it('should find one site by id', async () => {
    const result = await service.findOne('uuid');
    expect(result).toEqual(mockSite);
    expect(prisma.site.findUnique).toHaveBeenCalledWith({ where: { id: 'uuid' } });
  });

  it('should throw NotFoundException if site not found by id', async () => {
    jest.spyOn(prisma.site, 'findUnique').mockResolvedValueOnce(null);
    try {
      await service.findOne('non-existing-id');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Site with ID non-existing-id not found.');
    }
  });

  it('should update a site', async () => {
    const updateDto = { name: 'Updated Site' };
    const result = await service.update('uuid', updateDto);
    expect(result).toEqual(mockSite);
    expect(prisma.site.update).toHaveBeenCalledWith({ where: { id: 'uuid' }, data: updateDto });
  });

  it('should throw NotFoundException if site not found during update', async () => {
    jest.spyOn(prisma.site, 'findUnique').mockResolvedValueOnce(null); // Simulate no site found
    try {
      await service.update('non-existing-id', { name: 'Updated Site' });
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Site with ID non-existing-id not found.');
    }
  });

  it('should delete a site', async () => {
    const result = await service.remove('uuid');
    expect(result).toEqual(mockSite);
    expect(prisma.site.delete).toHaveBeenCalledWith({ where: { id: 'uuid' } });
  });

  it('should throw NotFoundException if site not found during deletion', async () => {
    jest.spyOn(prisma.site, 'findUnique').mockResolvedValueOnce(null);
    try {
      await service.remove('non-existing-id');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.message).toBe('Site with ID non-existing-id not found.');
    }
  });
});
