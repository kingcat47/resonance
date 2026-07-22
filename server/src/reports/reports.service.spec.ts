/**
 * ReportsService — 매칭 판정 로직 유닛테스트
 *
 * PrismaService / MailService를 mock으로 교체해 DB·메일 없이 실행 가능하다.
 * 완료 기준: 같은 tag 2건 → matched: true
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { CreateReportDto } from './dto/create-report.dto';

const sampleDto: CreateReportDto = {
  matching: {
    tag: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    share: { x: '1', y: 'deadbeef1234' },
  },
  incident: { C: 'aGVsbG8=', encryptedK: 'd29ybGQ=' },
  reporterContact: { C: 'Zm9v', encryptedK: 'YmFy' },
};

describe('ReportsService — 매칭 판정', () => {
  let service: ReportsService;

  const mockPrisma = {
    report: {
      create: jest.fn(),
      count: jest.fn(),
    },
    matchNotification: {
      // 기본: 새 삽입 성공 (최초 알림 케이스)
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const mockMail = {
    sendMatchAlert: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
    // clearAllMocks 후 기본값 재설정
    mockPrisma.matchNotification.create.mockResolvedValue({});
    mockMail.sendMatchAlert.mockResolvedValue(undefined);
  });

  it('신고 1건: count = 1 → matched: false', async () => {
    mockPrisma.report.create.mockResolvedValue({ id: 'r-1' });
    mockPrisma.report.count.mockResolvedValue(1);

    const result = await service.createReport(sampleDto);

    expect(result.matched).toBe(false);
  });

  it('[핵심] 같은 tag 2건째: count = 2 → matched: true', async () => {
    mockPrisma.report.create.mockResolvedValue({ id: 'r-2' });
    mockPrisma.report.count.mockResolvedValue(2);

    const result = await service.createReport(sampleDto);

    expect(result.matched).toBe(true);
  });

  it('count >= 3이어도 matched: true (임계값 이상이면 항상 충족)', async () => {
    mockPrisma.report.create.mockResolvedValue({ id: 'r-5' });
    mockPrisma.report.count.mockResolvedValue(5);

    const result = await service.createReport(sampleDto);

    expect(result.matched).toBe(true);
  });

  it('서버가 암호문을 그대로 저장함 — 복호화·변환 없음', async () => {
    mockPrisma.report.create.mockResolvedValue({ id: 'r-1' });
    mockPrisma.report.count.mockResolvedValue(1);

    await service.createReport(sampleDto);

    expect(mockPrisma.report.create).toHaveBeenCalledWith({
      data: {
        tag: sampleDto.matching.tag,
        shareX: sampleDto.matching.share.x,
        shareY: sampleDto.matching.share.y,
        incidentC: sampleDto.incident.C,
        incidentEncryptedK: sampleDto.incident.encryptedK,
        contactC: sampleDto.reporterContact.C,
        contactEncryptedK: sampleDto.reporterContact.encryptedK,
      },
    });
  });

  it('count는 저장 후에 같은 tag 기준으로 조회함', async () => {
    mockPrisma.report.create.mockResolvedValue({ id: 'r-1' });
    mockPrisma.report.count.mockResolvedValue(1);

    await service.createReport(sampleDto);

    expect(mockPrisma.report.count).toHaveBeenCalledWith({
      where: { tag: sampleDto.matching.tag },
    });
  });

  it('matched 최초 전환 시 알림 메일을 1회 발송한다', async () => {
    mockPrisma.report.create.mockResolvedValue({ id: 'r-2' });
    mockPrisma.report.count.mockResolvedValue(2);

    await service.createReport(sampleDto);

    // fire-and-forget이라 다음 틱까지 기다림
    await Promise.resolve();

    expect(mockPrisma.matchNotification.create).toHaveBeenCalledWith({
      data: { tag: sampleDto.matching.tag },
    });
    expect(mockMail.sendMatchAlert).toHaveBeenCalledTimes(1);
  });

  it('MatchNotification 이미 존재(P2002)하면 메일을 보내지 않는다', async () => {
    mockPrisma.report.create.mockResolvedValue({ id: 'r-3' });
    mockPrisma.report.count.mockResolvedValue(3); // 이미 matched 상태
    // unique constraint violation 시뮬레이션
    mockPrisma.matchNotification.create.mockRejectedValue({ code: 'P2002' });

    await service.createReport(sampleDto);
    await Promise.resolve();

    expect(mockMail.sendMatchAlert).not.toHaveBeenCalled();
  });
});
