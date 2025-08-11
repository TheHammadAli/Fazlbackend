
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class UpdateRequestStatusDto {
    @ApiProperty()
    @IsString()
    requestId: string;

    @ApiProperty({ enum: ['accept', 'reject', 'cancel', 'propose', 'confirm'] })
    @IsEnum(['accept', 'reject', 'cancel', 'propose', 'confirm'])
    action: 'accept' | 'reject' | 'cancel' | 'propose' | 'confirm';

    @ApiPropertyOptional({ example: '2025-07-01T18:00:00Z' })
    @IsOptional()
    @IsDateString()
    proposedDateTime?: string;
}
