/**
 * Reports — 통합테스트 (실제 PostgreSQL DB 필요)
 *
 * 실행 전 준비:
 *   1. docker compose up -d          (Postgres 컨테이너 시작)
 *   2. npx prisma migrate deploy     (server/ 디렉터리에서)
 *   3. npm run test:integration      (이 파일 실행)
 *
 * 핵심 검증: 같은 tag로 2번 POST → 두 번째 응답에 matched: true
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// .env 로드 (DATABASE_URL 필요)
import 'dotenv/config';

const TEST_TAG_PREFIX = 'integration-test-';

function makePayload(tag: string) {
  return {
    matching: {
      tag,
      share: { x: '1', y: 'deadbeef1234deadbeef' },
    },
    incident: { C: 'aGVsbG8=', encryptedK: 'd29ybGQ=' },
    reporterContact: { C: 'Zm9v', encryptedK: 'YmFy' },
  };
}

describe('POST /reports — 통합테스트 (DB 필요)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testTag = TEST_TAG_PREFIX + Date.now();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.report.deleteMany({
      where: { tag: { startsWith: TEST_TAG_PREFIX } },
    });
    await app.close();
  });

  it('1번째 신고: matched: false', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports')
      .send(makePayload(testTag))
      .expect(201);

    expect(res.body.matched).toBe(false);
    expect(res.body.id).toBeDefined();
  });

  it('[핵심] 2번째 신고(같은 tag): matched: true', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports')
      .send(makePayload(testTag))
      .expect(201);

    expect(res.body.matched).toBe(true);
  });

  it('GET /reports/:tag/status: count=2, matched=true', async () => {
    const res = await request(app.getHttpServer())
      .get(`/reports/${testTag}/status`)
      .expect(200);

    expect(res.body.count).toBe(2);
    expect(res.body.matched).toBe(true);
    expect(res.body.tag).toBe(testTag);
  });

  it('잘못된 payload → 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .post('/reports')
      .send({ matching: { tag: 'ok' } }) // incident, reporterContact 누락
      .expect(400);
  });
});
