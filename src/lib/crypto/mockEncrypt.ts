// TODO: 실제 암호로 교체 (Phase 1)
// ⚠️  이 함수는 절대 안전하지 않습니다. 데모/UI 확인용 더미입니다.
//     평문의 구조가 출력 길이에 그대로 드러나므로 실제 신고 제출에 사용하지 마세요.

/**
 * 각 유니코드 코드포인트를 4자리 16진수로 변환한 뒤 이어 붙인다.
 * 결정적(deterministic)이므로 같은 입력은 항상 같은 출력을 낸다.
 * 실제 암호화는 Phase 1에서 Web Crypto API 기반으로 교체될 예정이다.
 */
export function encryptMock(plaintext: string): string {
  return Array.from(plaintext)
    .map((ch) => (ch.codePointAt(0) ?? 0).toString(16).padStart(4, "0"))
    .join("")
    .toUpperCase();
}
