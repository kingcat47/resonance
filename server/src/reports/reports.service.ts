import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
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
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * 신고 payload를 저장하고 매칭 여부를 반환한다.
   *
   * 서버는 암호문(C, encryptedK)을 그대로 저장한다 — 복호화하지 않음.
   * 저장 후 같은 tag의 총 신고 수를 세어 2건 이상이면 matched: true.
   * matched로 처음 전환되는 순간 감독기관에게 알림 메일을 1회 발송한다.
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
    const matched = count >= 2;

    // 임계값 충족 시 감독기관 알림 — 중복 발송 방지 포함
    if (matched) {
      this.logger.log(`[MAIL] 매칭 감지, 알림 발송 호출 - tag: ${tag}, count: ${count}`);
      // fire-and-forget: 알림 실패가 신고 응답을 막지 않도록 await 안 씀
      this.sendFirstMatchNotification(tag).catch((err) =>
        this.logger.error('[MAIL] 알림 처리 중 예외:', err),
      );
    }

    return { id: report.id, matched };
  }

  /**
   * 해당 tag에 대한 최초 매칭 알림을 1회만 보낸다.
   *
   * MatchNotification 테이블이 @id = tag 이므로,
   * 동시 요청이 몰려도 DB unique constraint가 중복 삽입을 막는다.
   * 두 번째 삽입은 P2002(unique violation)로 실패 → 메일 발송 안 함.
   */
  private async sendFirstMatchNotification(tag: string): Promise<void> {
    // SMTP 미설정이면 MatchNotification을 기록하지 않는다.
    // 기록하면 나중에 SMTP 추가해도 P2002로 영구 차단되기 때문.
    const { SMTP_USER, SMTP_PASS, NOTIFY_TO } = process.env;
    if (!SMTP_USER || !SMTP_PASS || !NOTIFY_TO) {
      this.logger.warn(`[MAIL] SMTP 미설정 - 알림 건너뜀 (설정 후 재시도 가능) - tag: ${tag}`);
      return;
    }

    try {
      await this.prisma.matchNotification.create({ data: { tag } });
      this.logger.log(`[MAIL] MatchNotification 삽입 성공 → sendMatchAlert 호출`);
    } catch (err: unknown) {
      const e = err as { code?: string };
      // P2002 = Prisma unique constraint violation → 이미 알림 보낸 tag
      if (e?.code === 'P2002') {
        this.logger.log(`[MAIL] 이미 알림 발송됨, 스킵 - tag: ${tag}`);
        return;
      }
      throw err; // 다른 에러는 위로 전파
    }

    // MatchNotification 삽입 성공 = 이 tag의 최초 매칭 → 메일 발송
    await this.mail.sendMatchAlert(tag);
  }

  /** tag의 신고 건수와 매칭 여부를 반환한다 — 개발/확인용 */
  async getTagStatus(tag: string): Promise<TagStatusResult> {
    const count = await this.prisma.report.count({ where: { tag } });
    return { tag, count, matched: count >= 2 };
  }
}
