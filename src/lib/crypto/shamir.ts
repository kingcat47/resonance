/**
 * DESIGN.md §3-2 구현 — GF(p) 위의 Shamir (2, n) 비밀분산
 *
 * Phase 0: 수학적 정확성 검증 단계.
 * K를 클라이언트에서 계산 가능한 것은 의도적 단순화다.
 * Phase 1에서 K 생성을 OPRF/DH 기반 서버-클라이언트 협력 방식으로 교체 예정.
 *
 * 구현 원칙 (DESIGN.md §6):
 *   - Shamir 프로토콜 로직(다항식·보간·유한체 산술)은 직접 구현.
 *   - 해시 프리미티브(@noble/hashes)는 검증된 라이브러리 사용, 직접 구현 금지.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

// ── 유한체 GF(p) ─────────────────────────────────────────
// secp256k1 field prime: 2^256 - 2^32 - 977
// SHA-256 출력(256비트) 기반 비밀키를 수용하기에 충분한 크기의 소수.
const P: bigint = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F"
);

/** a mod p, 항상 음수 없는 값 반환 */
function mod(a: bigint, p: bigint = P): bigint {
  return ((a % p) + p) % p;
}

/** 반복 제곱법(square-and-multiply) 모듈러 거듭제곱 */
function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = 1n;
  let b = mod(base, m);
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % m;
    e >>= 1n;
    b = (b * b) % m;
  }
  return result;
}

/**
 * 모듈러 역원: Fermat 소정리 a^(p-2) mod p
 * p가 소수일 때만 성립. 직접 구현 (Shamir 프로토콜 로직의 일부).
 */
function modInv(a: bigint): bigint {
  if (mod(a) === 0n) throw new Error("modInv: 0의 역원은 존재하지 않습니다");
  return modPow(a, P - 2n, P);
}

/** SHA-256(@noble/hashes) 해시를 BigInt로 변환 */
function hashToBigInt(input: string): bigint {
  const bytes = sha256(new TextEncoder().encode(input));
  return BigInt("0x" + bytesToHex(bytes));
}

// ── 타입 ─────────────────────────────────────────────────

/** 비밀 직선 f(x) = ax + K (mod p) */
export interface Line {
  a: bigint; // 기울기 (태그에서 결정적으로 유도됨)
  K: bigint; // y절편 = 비밀키 (단독으로 노출되어선 안 됨)
}

/** GF(p) 위의 점 (신고자 한 명의 Shamir share) */
export interface Share {
  x: bigint; // 신고자 고유 좌표 (공개)
  y: bigint; // f(x) — 단독으로는 K를 알 수 없음
}

// ── 공개 API ─────────────────────────────────────────────

/**
 * tag 문자열에서 결정적으로 비밀 직선 {a, K}를 유도한다.
 * 같은 tag → 항상 같은 직선 → 같은 K.
 *
 * ⚠ Phase 0 한계: K가 tag만 있으면 클라이언트에서 계산 가능.
 *    Phase 1에서 OPRF/DH 기반 협력 방식으로 교체 예정 (DESIGN.md §3-1).
 */
export function deriveLine(tag: string): Line {
  const K = mod(hashToBigInt("resonance:K:" + tag));
  const a = mod(hashToBigInt("resonance:a:" + tag));
  return { a, K };
}

/**
 * 신고자 고유 x에서 직선 위의 점 (x, f(x)) 을 계산한다.
 * x는 양의 정수이어야 하며, 같은 tag에 대해 신고자마다 달라야 한다.
 */
export function makeShare(tag: string, x: bigint): Share {
  if (x <= 0n) throw new Error("x는 양의 정수여야 합니다");
  const { a, K } = deriveLine(tag);
  const y = mod(a * x + K);
  return { x, y };
}

/**
 * 서로 다른 점 2개로 라그랑주 보간 → f(0) = K 복원.
 *
 * ★ 이 함수가 임계값 매칭의 수학적 핵심이다. (테스트 2, 3 참고)
 *
 * 라그랑주 보간 공식 (x = 0에서):
 *   f(0) = y0 · L0(0) + y1 · L1(0)
 *   L0(0) = -x1 / (x0 - x1)
 *   L1(0) = -x0 / (x1 - x0)
 */
export function recoverK(shares: [Share, Share]): bigint {
  const [s0, s1] = shares;
  if (s0.x === s1.x) {
    throw new Error("두 점의 x가 동일합니다: 직선을 복원할 수 없습니다");
  }

  // L0(0) = -x1 / (x0 - x1)
  const L0 = mod(-s1.x * modInv(mod(s0.x - s1.x)));
  // L1(0) = -x0 / (x1 - x0)
  const L1 = mod(-s0.x * modInv(mod(s1.x - s0.x)));

  return mod(s0.y * L0 + s1.y * L1);
}
