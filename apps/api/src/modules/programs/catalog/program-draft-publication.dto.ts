import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { ProgramCommercialConfigDto } from '../publication/program-publication.dto';
export class DraftCommercialDto extends OmitType(ProgramCommercialConfigDto, ['programDefinitionId','expectedServiceRevision'] as const) {}
export class DraftPublicationItemDto {
  @ApiProperty() @IsUUID('4') serviceId!: string;
  @ApiProperty() @IsInt() @Min(1) expectedRevision!: number;
  @ApiPropertyOptional({ type: DraftCommercialDto }) @ValidateNested() @Type(() => DraftCommercialDto) configuration!: DraftCommercialDto;
}
export class DraftPublicationPreviewRequestDto {
  @ApiProperty({ type: [DraftPublicationItemDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ValidateNested({each:true}) @Type(() => DraftPublicationItemDto) items!: DraftPublicationItemDto[];
}
export class DraftPublicationApplyDto {
  @ApiProperty({type:[String]}) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsUUID('4',{each:true}) serviceIds!: string[];
}
export class DraftPublicationResultDto {
  @ApiProperty() serviceId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() ready!: boolean;
  @ApiPropertyOptional() code?: string;
  @ApiPropertyOptional() published?: boolean;
  @ApiPropertyOptional({type:DraftCommercialDto}) configuration?: DraftCommercialDto;
  @ApiPropertyOptional() termsBody?: string;
  @ApiPropertyOptional() summary?: string;
  @ApiPropertyOptional() category?: string;
  @ApiPropertyOptional({enum:['SHARED','FEMALE','MALE','REVIEW_REQUIRED']}) audience?: string;
  @ApiPropertyOptional({type:[String]}) pairs?: string[];
  @ApiPropertyOptional() contentChanged?: boolean;
}
export class DraftPublicationPreviewDto {
  @ApiProperty() id!: string;
  @ApiProperty({format:'date-time'}) expiresAt!: Date;
  @ApiProperty({type:[DraftPublicationResultDto]}) items!: DraftPublicationResultDto[];
}
export class DraftPublicationResultsDto {
  @ApiProperty({type:[DraftPublicationResultDto]}) items!: DraftPublicationResultDto[];
}
