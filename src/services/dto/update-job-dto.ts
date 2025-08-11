import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum } from "class-validator";

export class UpdateJobStatusDto {
    @ApiProperty()
    @IsString()
    requestId: string;

    @ApiProperty({ enum: ['start_job', 'complete_job'] })
    @IsEnum(['start_job', 'complete_job'])
    action: 'start_job' | 'complete_job';
}
