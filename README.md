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

## 암호 기술 상세

### 전체 흐름

```
[신고자 브라우저]

  가해자 정보
    ├─ 1. OPRF (Ristretto255)  →  K (비밀키)
    │         │
    │         ├─ 2. SHA-256(K)           →  tag (서버 매칭용)
    │         ├─ 3. Shamir f(x) = ax+K  →  share (점 1개)
    │         │       a = SHA-256(K)
    │         └─ 4. XOR + RSA-OAEP      →  encryptedK
    │
    └─ 5. AES-256-GCM          →  C (신고 내용 암호문)

  전송: { tag, share, C, encryptedK }  →  서버

[전송 채널]
  6. TLS  →  패킷 도청 방지
```

### 각 암호의 역할과 선택 이유

| 암호 | 어디에 | 왜 |
|---|---|---|
| **OPRF** (Ristretto255, RFC 9497) | K 유도 | 서버 없이 클라이언트 단독 계산 불가 → 사전대입 공격 차단 |
| **SHA-256** | tag = SHA256(K) | 단방향 해시. K에서 파생되므로 tag도 OPRF 보호를 받음. K 자체를 tag로 쓰면 Shamir 보안이 깨지므로 해시로 분리 |
| **Shamir (2,n)** GF(secp256k1) | 임계값 매칭 | "2명 이상 신고"를 수학적으로 강제. 코드 로직과 달리 서버 관리자가 우회 불가. 기울기 a = SHA-256(K)로 파생해 share 1개로 K 역산 불가 |
| **AES-256-GCM** | 신고 내용 암호화 | RSA는 ~190바이트 한계. 크기 제한 없고 빠름. GCM은 암호화+무결성 검증 동시 제공 |
| **RSA-2048-OAEP** | bundle = randomKey XOR K 래핑 | 공개키 배포만으로 암호화 가능. 비밀키는 감독기관만 보유. OAEP 패딩으로 선택 평문 공격 방어 |
| **XOR** | bundle 구성 | K와 randomKey를 AND 조건으로 묶는 가장 단순한 방법. 둘 중 하나만으론 나머지를 알 수 없음 |
| **TLS** | 네트워크 전송 | 전송 중 도청 방지. 저장된 데이터 보호(AES+RSA)와 역할이 다름 |

### 이중 잠금 구조

```
복호화 조건:
  잠금 1 (Shamir): share 2개 → K 복원
  잠금 2 (RSA):   감독기관 비밀키 → bundle 복원
  randomKey = bundle XOR K → AES 복호화

  서버: share 보유 but RSA 비밀키 없음 → 단독 복호화 불가
  감독기관: RSA 비밀키 보유 but K 없음 → 단독 복호화 불가
  둘 다 충족 시에만 열림
```

---

## 선행 연구

**[Callisto](https://www.projectcallisto.org/)** — 이 프로젝트의 직접적인 선행 연구.
성폭력 피해자가 가해자를 신고할 때, 같은 가해자를 2명 이상이 신고했을 때만 내용을 공개하는 암호학적 매칭 시스템.
OPRF + Shamir 비밀분산 조합을 사용하며, 직장안전의 암호 설계는 이 구조를 직장 내 괴롭힘 신고에 적용한 것이다.

- 논문: [Callisto: A Cryptographic Approach to Detecting Serial Perpetrators of Sexual Misconduct — ACM CCS 2018](https://dl.acm.org/doi/10.1145/3209811.3212699)
- 발표: [USENIX Enigma 2019](https://www.usenix.org/conference/enigma2019/presentation/rajan)

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
