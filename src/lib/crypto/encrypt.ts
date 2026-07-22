/**
 * DESIGN.md §3-2, §3-3 구현 — 이중 잠금 (Shamir + 감독기관 RSA)
 *
 * 이중 잠금 구조:
 *   잠금 1 (Shamir): K는 같은 가해자를 지목한 신고자 2명의 share로만 복원 가능
 *   잠금 2 (RSA):    bundle = RSA(randomKey XOR K) — RSA 비밀키 없이는 bundle 불가
 *
 * 두 잠금이 수학적으로 AND 관계:
 *   - RSA만 있으면: bundle = randomKey XOR K 를 얻지만, K 없이는 randomKey 모름
 *   - share 2개만 있으면: K를 알지만, bundle 없이는 randomKey 모름
 *   - 둘 다 있으면: randomKey = bundle XOR K → AES 복호화 가능
 *
 * 암호화 구현 (하이브리드):
 *   1. randomKey = AES-256-GCM 임시키
 *   2. C = AES-GCM(randomKey, 평문)
 *   3. bundle = randomKey XOR K_bytes
 *   4. encryptedK = RSA-OAEP(bundle)   ← 서버로 전송되는 형태
 */

// ── 타입 ──────────────────────────────────────────────────

export interface EncryptedBlob {
  /** base64 — 12바이트 IV ∥ AES-GCM 암호문 */
  C: string;
  /** base64 — RSA-OAEP로 래핑된 (randomKey XOR K) */
  encryptedK: string;
}

// ── 유틸 ──────────────────────────────────────────────────

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * bigint K를 32바이트 Uint8Array로 변환한다.
 * secp256k1 소수가 256비트이므로 K는 항상 32바이트 이하.
 */
function bigintToBytes32(n: bigint): Uint8Array {
  const hex = n.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) result[i] = a[i] ^ b[i];
  return result;
}

// ── 암호화 ────────────────────────────────────────────────

/**
 * 평문을 이중 잠금으로 암호화한다.
 *
 * @param plaintext - 암호화할 평문 (JSON 직렬화된 신고 내용 등)
 * @param publicKey - 감독기관 RSA-OAEP 공개키 (잠금 2)
 * @param K         - Shamir 비밀키, OPRF로 유도된 bigint (잠금 1)
 */
export async function encryptForSupervisor(
  plaintext: string,
  publicKey: CryptoKey,
  K: bigint,
): Promise<EncryptedBlob> {
  // 1. 임시 AES-256-GCM 키 생성
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  console.log("[Encrypt] 1. AES-256-GCM 임시 키 생성 완료");

  // 2. 평문 암호화 (IV는 매 호출마다 새로 생성)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(plaintext),
  );

  // C = base64(iv ∥ ciphertext)
  const ivAndCipher = new Uint8Array(12 + cipherBuf.byteLength);
  ivAndCipher.set(iv, 0);
  ivAndCipher.set(new Uint8Array(cipherBuf), 12);
  const C = toBase64(ivAndCipher.buffer);
  console.log("[Encrypt] 2. AES-GCM 암호화 완료 — C:", C.slice(0, 16) + "...");

  // 3. XOR 이중 잠금: bundle = randomKey XOR K
  const rawAesKey = new Uint8Array(await crypto.subtle.exportKey("raw", aesKey));
  const K_bytes = bigintToBytes32(K);
  const bundle = xorBytes(rawAesKey, K_bytes);
  console.log("[Encrypt] 3. XOR 잠금 — bundle = randomKey XOR K 완료");

  // 4. bundle을 RSA-OAEP로 래핑
  const encryptedK = toBase64(
    await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, bundle),
  );
  console.log("[Encrypt] 4. RSA-OAEP 래핑 완료 — encryptedK:", encryptedK.slice(0, 16) + "...");

  return { C, encryptedK };
}

// ── 복호화 ────────────────────────────────────────────────

/**
 * 이중 잠금을 해제해 평문을 복원한다.
 *
 * @param blob       - 암호문 블랍
 * @param privateKey - 감독기관 RSA-OAEP 비밀키 (잠금 2 해제)
 * @param K          - recoverK()로 복원한 Shamir 비밀키 (잠금 1 해제)
 */
export async function decryptFromSupervisor(
  blob: EncryptedBlob,
  privateKey: CryptoKey,
  K: bigint,
): Promise<string> {
  // 1. RSA-OAEP 언래핑 → bundle = randomKey XOR K
  console.log("[Decrypt] 1. RSA-OAEP 언래핑 시작 - encryptedK 길이:", blob.encryptedK.length);
  let bundle: Uint8Array;
  try {
    bundle = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        fromBase64(blob.encryptedK),
      ),
    );
    console.log("[Decrypt] 2. RSA-OAEP 언래핑 성공 - bundle 길이:", bundle.length);
  } catch (e) {
    console.error("[Decrypt] RSA-OAEP 실패 - 비밀키가 암호화 시 사용한 공개키와 다를 수 있음:", e);
    throw e;
  }

  // 2. XOR 해제: randomKey = bundle XOR K
  const K_bytes = bigintToBytes32(K);
  const rawAesKey = xorBytes(bundle, K_bytes);
  console.log("[Decrypt] 3. XOR 해제 완료 - K:", K.toString(16).slice(0, 16) + "...");

  // 3. AES 키 복원
  let aesKey: CryptoKey;
  try {
    aesKey = await crypto.subtle.importKey(
      "raw",
      rawAesKey,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    console.log("[Decrypt] 4. AES 키 복원 성공");
  } catch (e) {
    console.error("[Decrypt] AES 키 복원 실패:", e);
    throw e;
  }

  // 4. AES-GCM 복호화
  const ivAndCipher = fromBase64(blob.C);
  const iv = ivAndCipher.slice(0, 12);
  const ciphertext = ivAndCipher.slice(12);
  console.log("[Decrypt] 5. AES-GCM 복호화 시작 - C 길이:", blob.C.length);
  let plainBuf: ArrayBuffer;
  try {
    plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      ciphertext,
    );
  } catch (e) {
    console.error("[Decrypt] AES-GCM 복호화 실패 - K가 암호화 시와 다름:", e);
    throw e;
  }

  console.log("[Decrypt] 6. 복호화 완료");
  return new TextDecoder().decode(plainBuf);
}
