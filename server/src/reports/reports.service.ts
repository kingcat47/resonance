import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

export interface CreateReportResult {
  id: string;
  /** 같은 tag의 신고가 2건 이상이면 true — 임계값 충족 */
  matched: boolean;
}

export interface TagStatusResult {
  tag: string;
  count: number;
  matched: boolean;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 신고 payload를 저장하고 매칭 여부를 반환한다.
   *
   * 서버는 암호문(C, encryptedK)을 그대로 저장한다 — 복호화하지 않음.
   * 저장 후 같은 tag의 총 신고 수를 세어 2건 이상이면 matched: true.
   */
  async createReport(dto: CreateReportDto): Promise<CreateReportResult> {
    const { tag, share } = dto.matching;

    const report = await this.prisma.report.create({
      data: {
        tag,
        shareX: share.x,
        shareY: share.y,
        incidentC: dto.incident.C,
        incidentEncryptedK: dto.incident.encryptedK,
        contactC: dto.reporterContact.C,
        contactEncryptedK: dto.reporterContact.encryptedK,
      },
    });

    const count = await this.prisma.report.count({ where: { tag } });

    return { id: report.id, matched: count >= 2 };
  }

  /** tag의 신고 건수와 매칭 여부를 반환한다 — 개발/확인용 */
  async getTagStatus(tag: string): Promise<TagStatusResult> {
    const count = await this.prisma.report.count({ where: { tag } });
    return { tag, count, matched: count >= 2 };
  }
}
