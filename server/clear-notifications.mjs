// 테스트 데이터 전체 초기화 — Report와 MatchNotification은 항상 세트로 삭제
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const notifications = await prisma.matchNotification.deleteMany();
const reports = await prisma.report.deleteMany();
console.log('MatchNotification 삭제:', notifications.count, '건');
console.log('Report 삭제:', reports.count, '건');
await prisma.$disconnect();
