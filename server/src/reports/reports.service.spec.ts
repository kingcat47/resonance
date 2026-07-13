/**
 * ReportsService — 매칭 판정 로직 유닛테스트
 *
 * PrismaService를 mock으로 교체해 DB 없이 실행 가능하다.
 * 완료 기준: 같은 tag 2건 → matched: true
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
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
});
