# 직장안전

**직장 내 괴롭힘 익명 신고 시스템 — 서버 비공개 + 임계값 매칭 프로토타입**

같은 가해자를 2명 이상이 독립적으로 지목했을 때만 감독기관이 내용을 열람할 수 있다.
서버는 신고 내용을 절대 볼 수 없다.

---

## 핵심 설계 원칙

- **서버는 암호문만 저장한다.** 신고 내용·연락처는 감독기관 공개키로 암호화된 채 서버에 전달된다.
- **임계값 2 — Shamir 비밀분산.** 점(share) 1개로는 비밀키를 복원할 수 없다. 서로 다른 신고자의 점 2개가 있어야 직선이 복원된다.
- **이중 잠금.** Shamir 임계값 충족 + 감독기관 RSA 비밀키, 두 조건이 모두 충족돼야 신고 내용이 열린다.
- **OPRF로 tag 보호.** 가해자 식별 정보를 블라인딩해 서버에 보내고 서버 비밀키로 연산한 결과로 K를 유도한다. 클라이언트 단독으로 tag를 계산할 수 없어 사전대입 공격이 차단된다.
- **신원 검증은 외부 전제.** 이 시스템은 "한 사람 = 하나의 신고자"를 스스로 보장하지 않는다. 기관 발급 계정, SSO 등 외부 신원 검증 인프라와 연동을 전제로 한다.

암호 설계 전체와 신뢰 경계·한계는 [DESIGN.md](./DESIGN.md)에 정식으로 기록되어 있다.

---

## 기술 스택

| 계층 | 기술 |
|---|---|
| 프론트엔드 | Vite + React 19 + TypeScript + SCSS Modules |
| 라우팅 | react-router-dom v7 |
| 암호 | Web Crypto API (AES-256-GCM, RSA-OAEP), @noble/hashes (HMAC-SHA256), @noble/curves (Ristretto255 OPRF) |
| 백엔드 | NestJS 10 + Prisma 6 |
| DB | PostgreSQL 16 (Docker) |

---

## 실행 방법

### 1. 데이터베이스 시작

```bash
docker compose up -d
```

### 2. 백엔드 실행

```bash
cd server
npx prisma migrate deploy   # 최초 1회
npm run start:dev
```

### 3. 프론트엔드 실행

```bash
# 프로젝트 루트에서
npm install
npm run dev
```

---

## 테스트

```bash
# 프론트엔드 (Shamir + 암호화 유닛테스트)
npm test

# 백엔드 (신고 서비스 유닛테스트)
cd server
npm test
```

---

## 알려진 한계

- **1인 다수 신고 방지 불가** (외부 신원 검증 인프라 없이): 임시 이메일 등으로 신고를 반복 제출하면 임계값을 단독 충족할 수 있다. §5 참조.
- **네트워크 메타데이터**: 접속 IP·시각은 서버가 관찰 가능.

---

## 프로젝트 구조

```
직장안전/
├── src/                        # 프론트엔드
│   ├── lib/crypto/             # 암호 함수 (shamir, tag, encrypt, oprf)
│   ├── lib/api/                # 백엔드 API 클라이언트
│   ├── pages/                  # 라우트 페이지 (Home, Report, Admin)
│   └── components/             # UI 컴포넌트
├── server/                     # 백엔드 (NestJS)
│   ├── src/reports/            # 신고 수신 및 tag 매칭 API
│   ├── src/admin/              # 감독기관 콘솔 API
│   ├── src/oprf/               # OPRF 연산 엔드포인트
│   ├── src/mail/               # 매칭 알림 메일 (Gmail SMTP)
│   └── prisma/                 # DB 스키마
├── docker-compose.yml
└── DESIGN.md                   # 암호 설계 문서 (정식 사양)
```
