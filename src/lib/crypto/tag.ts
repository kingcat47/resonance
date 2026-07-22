/**
 * DESIGN.md §3-1 구현 — 가해자 tag 생성 (서버 매칭용)
 *
 * tag = SHA256("resonance-tag-v1:" + K.hex)
 *   K = OPRF(가해자정보) — 서버 비밀키 없이 계산 불가
 *
 * K가 OPRF 출력이므로 tag도 OPRF 보호를 받는다.
 * 공격자가 직원 명단을 갖고 있어도 서버 없이 tag를 미리 계산할 수 없다.
 * → 사전대입(dictionary) 공격 차단.
 */

import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * OPRF로 유도한 K에서 서버 매칭용 tag를 생성한다.
 *
 * K는 deriveKviaOPRF()의 반환값. 같은 가해자 → 같은 K → 같은 tag.
 * 서버 비밀키 없이는 K를 계산할 수 없으므로 tag도 단독 계산 불가.
 */
export function makeTagFromK(K: bigint): string {
  const input = new TextEncoder().encode("resonance-tag-v1:" + K.toString(16));
  return bytesToHex(sha256(input));
}

// ── 하위호환 (테스트에서만 사용) ──────────────────────────
// ⚠ 실제 신고 제출에는 사용하지 않는다. makeTagFromK를 사용할 것.
const TAG_DOMAIN_KEY = new TextEncoder().encode("resonance-tag-domain-v1");

export function makeTag(companyId: string, name: string, dept: string): string {
  const normalized = [companyId, name, dept]
    .map((s) => s.trim().toLowerCase())
    .join("|");
  const msgBytes = new TextEncoder().encode(normalized);
  const result = hmac(sha256, TAG_DOMAIN_KEY, msgBytes);
  return bytesToHex(result);
}
