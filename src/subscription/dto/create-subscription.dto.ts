import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ enum: ['product', 'shop'] })
  targetType: 'product' | 'shop';

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  durationInDays: number;

  @ApiPropertyOptional({ enum: ['listing', 'feed'], default: 'listing' })
  screenType?: 'listing' | 'feed';

  @ApiPropertyOptional()
  description?: string;
}