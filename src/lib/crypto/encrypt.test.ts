/**
 * encrypt.ts 왕복(round-trip) 유닛테스트
 *
 * 완료 기준:
 *   암호화 → 감독기관 비밀키로 복호화 → 원문 일치
 *
 * Node.js 19+ globalThis.crypto (Web Crypto API)를 사용하므로
 * Node.js 19 미만 환경에서는 실행되지 않습니다.
 */

import { beforeAll, describe, expect, it } from "vitest";

import {
  decryptFromSupervisor,
  encryptForSupervisor,
  generateSupervisorKeyPair,
} from "./encrypt";

describe("encrypt — 감독기관 공개키 이중잠금 왕복", () => {
  let keyPair: CryptoKeyPair;

  // RSA 키 생성은 느리므로 describe 전체에서 1회만 생성
  beforeAll(async () => {
    keyPair = await generateSupervisorKeyPair();
  });

  it("incident JSON 왕복: 암호화 → 복호화 → 원문 일치", async () => {
    const plain = JSON.stringify({
      occurredAt: "2025-03-15 오후 2시",
      locationDetail: "3층 식당",
      description: "식사 중 반복적 폭언",
      evidenceFiles: [],
    });

    const blob = await encryptForSupervisor(plain, keyPair.publicKey);
    const recovered = await decryptFromSupervisor(blob, keyPair.privateKey);

    expect(recovered).toBe(plain);
  });

  it("reporterContact JSON 왕복: 암호화 → 복호화 → 원문 일치", async () => {
    const plain = JSON.stringify({
      reporterType: "coworker",
      contactMethod: "email",
      contactValue: "reporter@example.com",
      consentToReveal: false,
    });

    const blob = await encryptForSupervisor(plain, keyPair.publicKey);
    const recovered = await decryptFromSupervisor(blob, keyPair.privateKey);

    expect(recovered).toBe(plain);
  });

  it("빈 문자열도 왕복 가능", async () => {
    const blob = await encryptForSupervisor("", keyPair.publicKey);
    const recovered = await decryptFromSupervisor(blob, keyPair.privateKey);
    expect(recovered).toBe("");
  });

  it("같은 평문 → 매번 다른 C (IV 무작위성)", async () => {
    const plain = "동일 입력";
    const blob1 = await encryptForSupervisor(plain, keyPair.publicKey);
    const blob2 = await encryptForSupervisor(plain, keyPair.publicKey);
    expect(blob1.C).not.toBe(blob2.C);
  });

  it("잘못된 비밀키로 복호화 시 오류 발생", async () => {
    const plain = "비밀 신고 내용";
    const blob = await encryptForSupervisor(plain, keyPair.publicKey);

    // 다른 키페어의 비밀키로 시도
    const wrongPair = await generateSupervisorKeyPair();
    await expect(
      decryptFromSupervisor(blob, wrongPair.privateKey),
    ).rejects.toThrow();
  });
});
