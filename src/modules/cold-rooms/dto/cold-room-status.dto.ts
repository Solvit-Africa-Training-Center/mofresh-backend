import { ApiProperty } from '@nestjs/swagger';

export class ColdRoomStatusDto {
  @ApiProperty({ example: 1000.0, description: 'Total capacity in KG' })
  totalCapacityKg: number;

  @ApiProperty({ example: 450.0, description: 'Current weight stored' })
  usedCapacityKg: number;

  @ApiProperty({ example: 550.0, description: 'Remaining space' })
  availableKg: number;

  @ApiProperty({ example: 45.0, description: 'Percentage of room filled' })
  occupancyPercentage: number;

  @ApiProperty({ example: true, description: 'Whether the room can accept more stock' })
  canAcceptMore: boolean;
}