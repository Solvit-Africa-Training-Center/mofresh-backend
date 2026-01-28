import { Controller, Post, Body } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '@/modules/auth/auth.service';
import {LoginDto} from './../users/dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

@Post('login')
@ApiOkResponse({ description: 'Login successful' })
// Change the @Body type to your new LoginDto
login(@Body() dto: LoginDto) {
  return this.authService.login(dto.email, dto.password);
}
}
