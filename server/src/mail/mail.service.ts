import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * 알림 메일 서비스 — 감독기관(변호사)에게 매칭 발생을 알린다.
 *
 * 대전제: 메일에 신고 내용을 절대 담지 않는다.
 *   서버는 신고 내용을 복호화할 수 없으므로, 보낼 수도 없다.
 *   "매칭 발생 + 콘솔 링크"만 포함한다.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor() {
    // 서버 시작 시 1회 — 이메일 설정 로드 확인
    const { SMTP_USER, SMTP_PASS, NOTIFY_TO } = process.env;
    this.logger.log(
      `[MAIL] 설정 확인 - SMTP_PASS: ${SMTP_PASS ? '있음' : '없음'}, ` +
        `from: ${SMTP_USER ?? '(미설정)'}, to: ${NOTIFY_TO ?? '(미설정)'}`,
    );
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_USER || !SMTP_PASS) return null;

    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST ?? 'smtp.gmail.com',
      port: Number(SMTP_PORT ?? 587),
      secure: false, // STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return this.transporter;
  }

  /**
   * 매칭 발생 알림 메일을 감독기관에게 발송한다.
   * 설정이 없거나 발송 실패해도 서버가 죽지 않는다(로그만 남김).
   */
  async sendMatchAlert(tag: string): Promise<void> {
    const transporter = this.getTransporter();
    const { SMTP_USER, NOTIFY_TO, CONSOLE_URL } = process.env;

    if (!transporter || !NOTIFY_TO) {
      this.logger.warn(
        `[MAIL] 설정 없음, 스킵 - tag: ${tag} ` +
          '(.env에 SMTP_USER, SMTP_PASS, NOTIFY_TO 설정 필요)',
      );
      return;
    }

    const consoleUrl = CONSOLE_URL ?? 'http://localhost:5173/admin';

    const text = [
      '[공명] 임계값 충족 신고 매칭',
      '',
      '특정 가해자에 대해 임계값을 충족하는 신고가 접수되었습니다.',
      '감독기관 콘솔에 접속해 확인해주세요.',
      '',
      `콘솔 링크: ${consoleUrl}`,
      '',
      '※ 이 메일에는 신고 내용이 포함되어 있지 않습니다.',
      '   신고 내용은 암호화된 상태이며 감독기관 비밀키로만 복호화할 수 있습니다.',
    ].join('\n');

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a1a1a;">[공명] 매칭 발생 알림</h2>
        <p>특정 가해자에 대해 <strong>임계값을 충족하는 신고</strong>가 접수되었습니다.</p>
        <p>감독기관 콘솔에 접속해 비밀키로 신고 내용을 확인해 주세요.</p>
        <p>
          <a href="${consoleUrl}" style="
            display:inline-block;padding:12px 24px;
            background:#d4a017;color:#fff;text-decoration:none;
            border-radius:8px;font-weight:600;">
            감독기관 콘솔 바로가기
          </a>
        </p>
        <hr style="border:none;border-top:1px solid #e8e8e8;margin:24px 0;">
        <p style="color:#7d7d7d;font-size:13px;">
          이 메일에는 신고 내용이 포함되어 있지 않습니다.<br>
          신고 내용은 암호화된 상태이며 감독기관 비밀키로만 복호화할 수 있습니다.
        </p>
        <p style="color:#7d7d7d;font-size:12px;">공명 시스템 자동 발송</p>
      </div>
    `;

    this.logger.log(`[MAIL] 발송 시도 - to: ${NOTIFY_TO}, tag: ${tag}`);

    try {
      const info = await transporter.sendMail({
        from: `"공명 시스템" <${SMTP_USER}>`,
        to: NOTIFY_TO,
        subject: '[공명] 매칭 발생 알림',
        text,
        html,
      });
      this.logger.log(`[MAIL] 발송 성공 - 응답: ${JSON.stringify(info.response ?? info.messageId)}`);
    } catch (err) {
      // 발송 실패 = 서버 처리 계속 (신고 저장은 이미 완료됨)
      const e = err as Error;
      this.logger.error(`[MAIL] 발송 실패 - 에러: ${e?.message}\n${e?.stack}`);
    }
  }
}
