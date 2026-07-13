import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * POST /reports
   * 암호화된 신고 payload를 저장한다.
   * 응답: { id, matched } — matched: true이면 같은 tag 2건 이상 (임계값 충족)
   */
  @Post()
  create(@Body() dto: CreateReportDto) {
    return this.reportsService.createReport(dto);
  }

  /**
   * GET /reports/:tag/status
   * tag의 신고 건수와 매칭 여부를 반환한다 — 개발 확인용.
   */
  @Get(':tag/status')
  getStatus(@Param('tag') tag: string) {
    return this.reportsService.getTagStatus(tag);
  }
}
