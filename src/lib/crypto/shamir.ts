/**
 * DESIGN.md §3-2 구현 — GF(p) 위의 Shamir (2, n) 비밀분산
 *
 * K는 외부에서 주입된다 (OPRF로 유도).
 * 기울기 a는 K에서 파생되므로, K를 모르면 a도 알 수 없다.
 * → 점(share) 1개 + a 값으로 K를 역산하는 공격 불가
 *
 * 이전 Phase 0 한계 (수정됨):
 *   - K = hash(tag) → 태그만 알면 K 계산 가능 → Shamir 의미 없음
 *   - a = hash("resonance:a:" + tag) → 태그만 알면 a 계산 가능
 *     → 점 1개 + a → K = y - a·x 로 K 복원 가능
 *
 * 현재 구조:
 *   - K = OPRF(tag_input)  — 서버 비밀키 없이 계산 불가
 *   - a = hash("resonance:a:" + K.hex)  — K를 모르면 a도 모름
 *   → 점 1개로 K 역산 불가 (해시 역함수 문제)
 *   → 점 2개 → 라그랑주 보간 → K 복원 가능 ✓
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

// ── 유한체 GF(p) ─────────────────────────────────────────
// secp256k1 field prime: 2^256 - 2^32 - 977
const P: bigint = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F"
);

function mod(a: bigint, p: bigint = P): bigint {
  return ((a % p) + p) % p;
}

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

function modInv(a: bigint): bigint {
  if (mod(a) === 0n) throw new Error("modInv: 0의 역원은 존재하지 않습니다");
  return modPow(a, P - 2n, P);
}

function hashToBigInt(input: string): bigint {
  const bytes = sha256(new TextEncoder().encode(input));
  return BigInt("0x" + bytesToHex(bytes));
}

// ── 타입 ─────────────────────────────────────────────────

/** GF(p) 위의 점 (신고자 한 명의 Shamir share) */
export interface Share {
  x: bigint; // 신고자 고유 좌표 (공개)
  y: bigint; // f(x) — 단독으로는 K를 알 수 없음
}

// ── 내부 헬퍼 ────────────────────────────────────────────

/**
 * K에서 기울기 a를 결정적으로 유도한다.
 * a를 tag가 아닌 K에서 파생 → K를 모르면 a도 모름
 * → 점 1개 + a로 K를 역산하는 공격 차단
 */
function deriveSlope(K: bigint): bigint {
  return mod(hashToBigInt("resonance:a:" + K.toString(16)));
}

// ── 공개 API ─────────────────────────────────────────────

/**
 * OPRF로 얻은 K와 신고자 고유 x로 Shamir share를 생성한다.
 *
 * f(x) = a·x + K (mod p), 여기서 a = deriveSlope(K)
 * x는 호출자가 crypto random으로 생성한 양의 정수여야 한다.
 */
export function makeShare(K: bigint, x: bigint): Share {
  if (x <= 0n) throw new Error("x는 양의 정수여야 합니다");
  const a = deriveSlope(K);
  const y = mod(a * x + K);
  return { x, y };
}

/**
 * 서로 다른 점 2개로 라그랑주 보간 → f(0) = K 복원.
 *
 * ★ 이 함수가 임계값 매칭의 수학적 핵심이다.
 *
 * 라그랑주 보간 공식 (x = 0에서):
 *   f(0) = y0·L0(0) + y1·L1(0)
 *   L0(0) = -x1 / (x0 - x1)
 *   L1(0) = -x0 / (x1 - x0)
 */
export function recoverK(shares: [Share, Share]): bigint {
  const [s0, s1] = shares;
  if (s0.x === s1.x) {
    throw new Error("두 점의 x가 동일합니다: 직선을 복원할 수 없습니다");
  }

  const L0 = mod(-s1.x * modInv(mod(s0.x - s1.x)));
  const L1 = mod(-s0.x * modInv(mod(s1.x - s0.x)));

  return mod(s0.y * L0 + s1.y * L1);
}

/**
 * 0이 아닌 암호학적으로 안전한 랜덤 x를 생성한다.
 * Date.now() 대신 사용 — 동시 제출 시 충돌 방지.
 */
export function randomShareX(): bigint {
  let x: bigint;
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    x = BigInt("0x" + bytesToHex(bytes));
  } while (x === 0n);
  return x;
}
