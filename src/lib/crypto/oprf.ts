/**
 * OPRF (Oblivious Pseudo-Random Function) 클라이언트 구현
 * @noble/curves ristretto255_oprf — RFC 9497 VOPRF 표준 구현체 사용
 *
 * 프로토콜 개요:
 *   1. 클라이언트: blind(input) → { blind scalar, blinded point }
 *   2. 서버: blindEvaluate(secretKey, blinded) → evaluated point 반환
 *      (서버는 input 원문을 모름 — blinded 점만 봄)
 *   3. 클라이언트: finalize(input, blind, evaluated) → K (64바이트 PRF 출력)
 *
 * K는 서버 비밀키 없이는 클라이언트 단독 계산 불가.
 * → tag 사전대입 공격 방어 (DESIGN.md §3-1 개선)
 */

import { ristretto255_oprf } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// ── 상수 ──────────────────────────────────────────────────

// Shamir GF(p) 소수 — secp256k1 field prime
const SHAMIR_P: bigint = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F"
);

// RFC 9497 OPRF 모드 (Ristretto255 기반)
const oprf = ristretto255_oprf.oprf;

// OPRF 도메인 분리 태그 — 다른 용도와 충돌 방지
const DST_PREFIX = "resonance-oprf-v1:";

const API_BASE: string =
  (import.meta.env.VITE_API_URL as string) ?? "http://localhost:3001";

// ── 정규화 ────────────────────────────────────────────────

/**
 * 가해자 식별 정보를 정규화한 문자열을 반환한다.
 * tag 생성(tag.ts의 makeTag)과 OPRF 입력 모두 이 규칙을 따른다.
 * 같은 가해자 → 같은 정규화 문자열 → 같은 tag, 같은 K.
 */
export function normalizePerpetratorInput(
  companyId: string,
  name: string,
  dept: string
): string {
  return [companyId, name, dept]
    .map((s) => s.trim().toLowerCase())
    .join("|");
}

// ── OPRF 핵심 ─────────────────────────────────────────────

/**
 * OPRF 프로토콜로 가해자 식별 정보에서 비밀키 K를 유도한다.
 *
 * 반환값 K는 Shamir GF(p)의 bigint.
 * 서버 비밀키 없이는 단독 계산 불가 → 사전대입 공격 방어.
 *
 * @param normalized - normalizePerpetratorInput()의 반환값
 */
export async function deriveKviaOPRF(normalized: string): Promise<bigint> {
  const input = new TextEncoder().encode(DST_PREFIX + normalized);

  // 1. 클라이언트 블라인딩 — 서버는 원문을 알 수 없음
  const { blind, blinded } = oprf.blind(input);
  console.log("[OPRF] 1. 블라인딩 완료 — blinded:", bytesToHex(blinded).slice(0, 16) + "...");

  // 2. 서버로 blinded 전송 → 서버가 비밀키 s로 연산 → evaluated 수신
  console.log("[OPRF] 2. 서버로 blinded point 전송 중...");
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/oprf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blinded: bytesToHex(blinded) }),
    });
  } catch {
    throw new Error(
      "OPRF 서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요."
    );
  }
  if (!res.ok) throw new Error(`OPRF 오류: ${res.status}`);
  const { response: evaluatedHex } = (await res.json()) as { response: string };
  console.log("[OPRF] 3. 서버 응답 수신 — evaluated:", evaluatedHex.slice(0, 16) + "...");

  // 3. 언블라인딩 — r 역원 적용 → H(input)^s
  const evaluated = hexToBytes(evaluatedHex);
  const output = oprf.finalize(input, blind, evaluated);
  console.log("[OPRF] 4. 언블라인딩 완료 — PRF output:", bytesToHex(output).slice(0, 16) + "...");

  // 4. PRF 출력 → Shamir GF(p)의 bigint로 변환
  const K_raw = BigInt("0x" + bytesToHex(output));
  const K = ((K_raw % SHAMIR_P) + SHAMIR_P) % SHAMIR_P;
  console.log("[OPRF] 5. K 유도 완료 (GF(p) 환산):", K.toString(16).slice(0, 16) + "...");
  return K;
}
