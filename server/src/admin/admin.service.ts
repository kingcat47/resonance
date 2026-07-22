import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MatchedReport {
  id: string;
  shareX: string;
  shareY: string;
  incidentC: string;
  incidentEncryptedK: string;
  contactC: string;
  contactEncryptedK: string;
  createdAt: Date;
}

export interface MatchedCase {
  tag: string;
  count: number;
  /** 암호문 그대로 반환 — 서버는 절대 복호화하지 않는다 */
  reports: MatchedReport[];
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * matched 상태인(같은 tag 2건 이상) 사건 목록과 각 신고의 암호문을 반환한다.
   * 서버는 암호문을 전달할 뿐, 복호화하지 않는다.
   */
  async getMatches(): Promise<{ matches: MatchedCase[] }> {
    // 1. tag별 신고 수 집계
    const groups = await this.prisma.report.groupBy({
      by: ['tag'],
      _count: { id: true },
    });

    const matchedTags = groups
      .filter((g) => g._count.id >= 2)
      .map((g) => g.tag);

    if (matchedTags.length === 0) return { matches: [] };

    // 2. 각 tag의 암호문(share 포함) 조회
    const matches: MatchedCase[] = await Promise.all(
      matchedTags.map(async (tag) => {
        const reports = await this.prisma.report.findMany({
          where: { tag },
          select: {
            id: true,
            shareX: true,
            shareY: true,
            incidentC: true,
            incidentEncryptedK: true,
            contactC: true,
            contactEncryptedK: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        });
        return { tag, count: reports.length, reports };
      }),
    );

    return { matches };
  }
}
