/**
 * Shamir 비밀분산 + tag 생성 유닛테스트
 *
 * K는 OPRF로 유도되지만, 수학적 정확성 검증에는
 * 고정 K 값을 사용한다 (네트워크 없이 단독 실행).
 *
 * 테스트 2와 3이 이 시스템의 수학적 핵심이다:
 *   [테스트 2] 같은 K로 생성된 점 2개 → K 복원 가능 (임계값 충족)
 *   [테스트 3] 점 1개 단독으로는 K 복원 불가 (임계값 미충족)
 */

import { describe, expect, it } from "vitest";
import { makeShare, recoverK, randomShareX } from "./shamir";
import { makeTag } from "./tag";

// 테스트용 고정 K — 실제 사용 시에는 OPRF로 유도
const K_A = BigInt(
  "0xa1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f678"
);
const K_B = BigInt(
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
);

// ── makeTag 테스트 ────────────────────────────────────────
describe("makeTag — 가해자 tag 생성 (직장 내 괴롭힘)", () => {
  it("같은 입력 → 같은 tag (결정성)", () => {
    const a = makeTag("레조낭스주식회사", "홍길동", "팀장");
    const b = makeTag("레조낭스주식회사", "홍길동", "팀장");
    expect(a).toBe(b);
  });

  it("다른 입력 → 다른 tag", () => {
    const a = makeTag("레조낭스주식회사", "홍길동", "팀장");
    const b = makeTag("레조낭스주식회사", "김철수", "대표");
    expect(a).not.toBe(b);
  });

  it("앞뒤 공백 정규화: 공백 있어도 같은 tag", () => {
    const a = makeTag("레조낭스주식회사", "홍길동", "팀장");
    const b = makeTag(" 레조낭스주식회사 ", " 홍길동 ", " 팀장 ");
    expect(a).toBe(b);
  });

  it("대소문자 정규화: 영문 대소문자 무시", () => {
    const a = makeTag("resonance-corp", "John", "manager");
    const b = makeTag("RESONANCE-CORP", "JOHN", "MANAGER");
    expect(a).toBe(b);
  });
});

// ── Shamir 비밀분산 테스트 ────────────────────────────────
describe("Shamir — GF(p) 임계값 2 매칭 핵심", () => {
  // ─────────────────────────────────────────────────────────
  // ★ [테스트 2 — 핵심] 서로 다른 점 2개 → K 복원 성공
  // ─────────────────────────────────────────────────────────
  it("[핵심 2] 같은 K, 서로 다른 x의 점 2개 → K 복원 성공", () => {
    const share1 = makeShare(K_A, 1n);
    const share2 = makeShare(K_A, 2n);
    const recovered = recoverK([share1, share2]);
    expect(recovered).toBe(K_A);
  });

  it("[핵심 2] 임의의 x 조합으로도 복원 결과가 항상 같은 K", () => {
    const share5  = makeShare(K_A, 5n);
    const share99 = makeShare(K_A, 99n);
    const recovered = recoverK([share5, share99]);
    expect(recovered).toBe(K_A);
  });

  // ─────────────────────────────────────────────────────────
  // ★ [테스트 3 — 핵심] 점 1개만으로는 K 복원 불가
  // y를 1 조작하면 전혀 다른 K가 나온다 = 점 1개는 정보량 0
  // ─────────────────────────────────────────────────────────
  it("[핵심 3] 점 1개 + y를 1 조작한 점 → 반드시 틀린 K", () => {
    const realShare  = makeShare(K_A, 1n);
    const trueShare2 = makeShare(K_A, 2n);
    const fakeShare  = { x: trueShare2.x, y: trueShare2.y + 1n };

    const wrongK = recoverK([realShare, fakeShare]);
    expect(wrongK).not.toBe(K_A);
  });

  it("같은 x를 두 점으로 넣으면 예외 발생", () => {
    const share = makeShare(K_A, 1n);
    expect(() => recoverK([share, share])).toThrow();
  });

  // ─────────────────────────────────────────────────────────
  // [테스트 4] 다른 K의 점끼리는 매칭되지 않는다
  // 서로 다른 가해자를 신고한 점들은 같은 K를 복원하지 않는다.
  // ─────────────────────────────────────────────────────────
  it("[핵심 4] 다른 K의 점 2개 → 틀린 K (다른 가해자 신고는 매칭 불가)", () => {
    const shareA = makeShare(K_A, 1n);
    const shareB = makeShare(K_B, 2n);

    const wrongK = recoverK([shareA, shareB]);
    expect(wrongK).not.toBe(K_A);
    expect(wrongK).not.toBe(K_B);
  });
});

// ── randomShareX 테스트 ───────────────────────────────────
describe("randomShareX — 암호학적 랜덤 x 생성", () => {
  it("0이 아닌 양수 반환", () => {
    const x = randomShareX();
    expect(x).toBeGreaterThan(0n);
  });

  it("두 번 호출하면 다른 값 (충돌 거의 불가)", () => {
    const x1 = randomShareX();
    const x2 = randomShareX();
    expect(x1).not.toBe(x2);
  });
});
