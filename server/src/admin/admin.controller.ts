import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from './admin-key.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminKeyGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /admin/matches
   * matched 상태인 tag 목록과 각 신고의 암호문을 반환한다.
   * 서버는 복호화하지 않는다. 브라우저(감독기관 콘솔)에서만 복호화한다.
   */
  @Get('matches')
  getMatches() {
    return this.adminService.getMatches();
  }
}
