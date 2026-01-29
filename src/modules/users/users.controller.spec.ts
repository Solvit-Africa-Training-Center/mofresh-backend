import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+250788000000',
    role: UserRole.CLIENT,  
    siteId: 'site-uuid',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    register: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+250788000000',
        role: UserRole.CLIENT, 
        siteId: 'site-uuid',
      };

      mockUsersService.register.mockResolvedValue({
        status: 'success',
        message: 'User registered successfully.',
        data: mockUser,
      });

      const result = await controller.register(dto);
      expect(result.status).toBe('success');
      expect(result.data).toEqual(mockUser);
    });

    it('should throw conflict if user exists', async () => {
      mockUsersService.register.mockRejectedValue(new ConflictException());

      await expect(controller.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+250788000000',
        role: UserRole.CLIENT,  
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      mockUsersService.findAll.mockResolvedValue({
        status: 'success',
        message: 'Users fetched successfully',
        data: [mockUser],
      });

      const result = await controller.findAll();
      expect(result.data).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      const result = await controller.findOne('user-uuid');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne('wrong-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateDto = { firstName: 'Jane' };
      mockUsersService.update.mockResolvedValue({ ...mockUser, ...updateDto });

      const result = await controller.update('user-uuid', updateDto);
      expect(result.firstName).toBe('Jane');
    });
  });

  describe('remove', () => {
    it('should soft delete a user', async () => {
      mockUsersService.remove.mockResolvedValue({ ...mockUser, isActive: false, deletedAt: new Date() });
      const result = await controller.remove('user-uuid');
      expect(result.isActive).toBe(false);
    });
  });
});
