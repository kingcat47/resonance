/**
 * Shamir 비밀분산 + tag 생성 유닛테스트
 *
 * 테스트 2와 3이 이 시스템의 수학적 핵심이다:
 *   [테스트 2] 같은 가해자를 신고자 2명이 지목 → K 복원 가능 (임계값 충족)
 *   [테스트 3] 신고자 1명 단독으로는 K 복원 불가 (임계값 미충족)
 */

import { describe, expect, it } from "vitest";
import { deriveLine, makeShare, recoverK } from "./shamir";
import { makeTag } from "./tag";

// ── makeTag 테스트 ────────────────────────────────────────
describe("makeTag — 가해자 tag 생성", () => {
  it("같은 입력 → 같은 tag (결정성)", () => {
    const a = makeTag("F001", "홍길동", "요양보호사");
    const b = makeTag("F001", "홍길동", "요양보호사");
    expect(a).toBe(b);
  });

  it("다른 입력 → 다른 tag", () => {
    const a = makeTag("F001", "홍길동", "요양보호사");
    const b = makeTag("F001", "김철수", "시설장");
    expect(a).not.toBe(b);
  });

  it("앞뒤 공백 정규화: 공백 있어도 같은 tag", () => {
    const a = makeTag("F001", "홍길동", "요양보호사");
    const b = makeTag(" F001 ", " 홍길동 ", " 요양보호사 ");
    expect(a).toBe(b);
  });

  it("대소문자 정규화: 영문 대소문자 무시", () => {
    const a = makeTag("facility-1", "John", "nurse");
    const b = makeTag("FACILITY-1", "JOHN", "NURSE");
    expect(a).toBe(b);
  });
});

// ── Shamir 비밀분산 테스트 ────────────────────────────────
describe("Shamir — GF(p) 임계값 2 매칭 핵심", () => {
  const TAG_A = makeTag("F001", "홍길동", "요양보호사");
  const TAG_B = makeTag("F001", "김철수", "시설장"); // 다른 가해자

  // ─────────────────────────────────────────────────────────
  // ★ [테스트 2 — 핵심] 서로 다른 점 2개 → K 복원 성공
  //
  // 이것이 Shamir 임계값 매칭의 수학적 핵심이다:
  // 같은 가해자를 지목한 신고자 2명이 각자의 점(share)을 제출하면
  // 라그랑주 보간으로 직선을 복원해 비밀키 K를 얻을 수 있다.
  // ─────────────────────────────────────────────────────────
  it("[핵심 2] 같은 tag, 서로 다른 x의 점 2개 → K 복원 성공", () => {
    const { K } = deriveLine(TAG_A);

    const share1 = makeShare(TAG_A, 1n); // 신고자 A의 점
    const share2 = makeShare(TAG_A, 2n); // 신고자 B의 점 (x가 다름)

    const recovered = recoverK([share1, share2]);
    expect(recovered).toBe(K);
  });

  it("[핵심 2] 임의의 x 조합으로도 복원 결과가 항상 같은 K", () => {
    const { K } = deriveLine(TAG_A);

    const share5  = makeShare(TAG_A, 5n);
    const share99 = makeShare(TAG_A, 99n);

    const recovered = recoverK([share5, share99]);
    expect(recovered).toBe(K);
  });

  // ─────────────────────────────────────────────────────────
  // ★ [테스트 3 — 핵심] 점 1개만으로는 K 복원 불가
  //
  // 신고 1건 단독으로는 임계값이 충족되지 않는다.
  // 점 1개가 주어졌을 때 가능한 K값은 GF(p) 전체이므로 정보량이 0이다.
  // 두 번째 점을 y값 1 조작하는 것만으로도 완전히 다른 K가 복원된다.
  // ─────────────────────────────────────────────────────────
  it("[핵심 3] 점 1개 + y를 1 조작한 점 → 반드시 틀린 K (1건 신고로 임계값 충족 불가)", () => {
    const { K } = deriveLine(TAG_A);
    const realShare  = makeShare(TAG_A, 1n);

    // 두 번째 점의 y를 정확한 값에서 1 벗어나게 조작
    // → 이 점은 원래 직선 위에 없으므로 K가 아닌 엉뚱한 값이 복원된다
    const trueShare2 = makeShare(TAG_A, 2n);
    const fakeShare  = { x: trueShare2.x, y: trueShare2.y + 1n };

    const wrongK = recoverK([realShare, fakeShare]);
    expect(wrongK).not.toBe(K);
  });

  it("같은 x를 두 점으로 넣으면 예외 발생", () => {
    const share = makeShare(TAG_A, 1n);
    expect(() => recoverK([share, share])).toThrow();
  });

  // ─────────────────────────────────────────────────────────
  // [테스트 4] 다른 tag의 점끼리는 매칭되지 않는다
  //
  // 서로 다른 가해자를 지목한 신고는 임계값을 충족하지 않는다.
  // 각 tag마다 독립적인 직선(K)이 존재하기 때문이다.
  // ─────────────────────────────────────────────────────────
  it("[핵심 4] 다른 tag의 점 2개 → 틀린 K (다른 가해자 신고는 매칭 불가)", () => {
    const kA = deriveLine(TAG_A).K;
    const kB = deriveLine(TAG_B).K;

    const shareA = makeShare(TAG_A, 1n); // 가해자 A를 지목
    const shareB = makeShare(TAG_B, 2n); // 가해자 B를 지목 (다른 사람)

    const wrongK = recoverK([shareA, shareB]);

    // TAG_A의 K도, TAG_B의 K도 아닌 엉뚱한 값이 나온다
    expect(wrongK).not.toBe(kA);
    expect(wrongK).not.toBe(kB);
  });
});
