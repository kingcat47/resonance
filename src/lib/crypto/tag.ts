/**
 * DESIGN.md §3-1 구현 — 가해자 tag 생성 (서버 매칭용)
 *
 * 이 tag는 서버가 "같은 가해자를 지목한 신고"를 매칭할 때만 쓰인다.
 * Shamir 비밀키 K는 이 파일이 아니라 oprf.ts의 deriveKviaOPRF()로 유도한다.
 *
 * ⚠ 알려진 한계 — 사전대입(dictionary) 공격에 취약:
 *   클라이언트가 서버 없이 단독으로 tag를 계산할 수 있으므로,
 *   공격자가 직원 명단으로 모든 tag를 미리 계산해 DB와 대조하면
 *   누가 신고됐는지 역추적할 수 있다.
 *
 *   OPRF는 이미 구현됐지만(oprf.ts) K 유도에만 쓰이고,
 *   이 매칭 tag는 아직 HMAC 방식을 유지한다.
 *   tag 자체를 OPRF 출력으로 교체하면 이 취약점을 닫을 수 있다.
 */

import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

// 고정 도메인 키 — 다른 HMAC 용도와의 충돌 방지
const TAG_DOMAIN_KEY = new TextEncoder().encode("resonance-tag-domain-v1");

/**
 * 가해자 식별 정보에서 HMAC-SHA256 tag를 생성한다.
 *
 * 서버에는 이 tag(해시값)만 전송되고, 이름·직위 원문은 전송되지 않는다.
 * 같은 회사·가해자를 지목한 신고들은 동일한 tag를 가지므로
 * 서버가 원문 없이 일치를 판정할 수 있다.
 *
 * 정규화 규칙: 앞뒤 공백 제거 + 소문자화 + `|` 구분자로 연결.
 */
export function makeTag(companyId: string, name: string, dept: string): string {
  const normalized = [companyId, name, dept]
    .map((s) => s.trim().toLowerCase())
    .join("|");
  const msgBytes = new TextEncoder().encode(normalized);
  const result = hmac(sha256, TAG_DOMAIN_KEY, msgBytes);
  return bytesToHex(result);
}
