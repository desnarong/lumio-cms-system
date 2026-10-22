import { Module } from '@nestjs/common';
import { TemplateApplyService } from './template-apply.service';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplateApplyService],
  exports: [TemplatesService, TemplateApplyService],
})
export class TemplatesModule {}