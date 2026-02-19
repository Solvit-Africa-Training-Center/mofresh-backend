import { PartialType } from '@nestjs/swagger';
import { CreateColdPlateDto } from './cold-assets.dto';
import { CreateColdBoxDto } from './cold-assets.dto';
import { CreateTricycleDto } from './cold-assets.dto';

// Using PartialType makes all fields optional for updates
export class UpdateTricycleDto extends PartialType(CreateTricycleDto) {}
export class UpdateColdBoxDto extends PartialType(CreateColdBoxDto) {}
export class UpdateColdPlateDto extends PartialType(CreateColdPlateDto) {}
