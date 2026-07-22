/**
 * 감독기관 RSA-OAEP 키 관리
 *
 * 공개키: VITE_SUPERVISOR_PUBLIC_KEY 환경변수에서 로드
 * 비밀키: 감독기관이 Admin 콘솔에서 직접 붙여넣기 (메모리에만 존재)
 */

const RSA_ALGO = { name: "RSA-OAEP", hash: "SHA-256" } as const;

/**
 * 신고 암호화에 사용할 감독기관 공개키를 반환한다.
 * VITE_SUPERVISOR_PUBLIC_KEY 환경변수에서 로드한다.
 */
export async function getSupervisorPublicKey(): Promise<CryptoKey> {
  const envKey = import.meta.env.VITE_SUPERVISOR_PUBLIC_KEY as string | undefined;
  if (!envKey) throw new Error("VITE_SUPERVISOR_PUBLIC_KEY가 설정되지 않았습니다");
  const jwk = JSON.parse(envKey) as JsonWebKey;
  return crypto.subtle.importKey("jwk", jwk, RSA_ALGO, false, ["encrypt"]);
}

/**
 * JWK JSON 문자열에서 감독기관 RSA 비밀키를 가져온다.
 * Admin 콘솔에서 감독기관이 직접 붙여넣는 방식으로 사용.
 * 반환된 CryptoKey는 메모리에만 존재하며 어디에도 저장되지 않는다.
 */
export async function importPrivateKeyFromJwk(jwkString: string): Promise<CryptoKey> {
  let jwk: JsonWebKey;
  try {
    // 복붙 시 끼어드는 줄바꿈·제어문자 제거
    const cleaned = jwkString.replace(/[\u0000-\u001F\u007F]/g, "").trim();
    jwk = JSON.parse(cleaned) as JsonWebKey;
    console.log("[RSA] JWK 파싱 성공 - kty:", jwk.kty, "alg:", jwk.alg, "key_ops:", jwk.key_ops);
  } catch (e) {
    console.error("[RSA] JWK JSON 파싱 실패:", e);
    throw new Error("유효한 JWK JSON이 아닙니다");
  }
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, RSA_ALGO, false, ["decrypt"]);
    console.log("[RSA] 비밀키 로드 성공 - type:", key.type, "algorithm:", key.algorithm.name);
    return key;
  } catch (e) {
    console.error("[RSA] crypto.subtle.importKey 실패:", e);
    throw new Error("RSA-OAEP 비밀키 형식이 올바르지 않습니다");
  }
}
