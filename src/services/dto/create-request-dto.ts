
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
export class CreateRequestDto {
    @ApiProperty()
    @IsString()
    serviceId: string;

   
    @ApiProperty()
    @IsString()
    customerId: string;

    @ApiProperty({ example: '2025-07-01T15:00:00Z' })
    @IsDateString()
    requestedDateTime: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    message?: string;
}
