import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from '@prisma/client';

const TEST_SECRET = 'Complex_T3st_Value!99';
const MOCK_USER_BASE = {
  id: '1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.CLIENT,
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    register: jest.fn().mockImplementation((dto) =>
      Promise.resolve({
        status: 'success',
        data: { id: MOCK_USER_BASE.id, ...dto, isActive: true },
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      const createUserDto = {
        ...MOCK_USER_BASE,
        password: TEST_SECRET,
        phone: '1234567890',
      };

      const result = await controller.register(createUserDto);
      expect(result.status).toBe('success');
      expect(service.register).toHaveBeenCalledWith(createUserDto);
    });
  });
});
