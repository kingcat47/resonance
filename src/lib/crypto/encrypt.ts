/**
 * DESIGN.md §3-2, §3-3 구현 — 감독기관 공개키 이중 잠금
 *
 * 이중 잠금:
 *   잠금 1 (Shamir): 같은 가해자를 지목한 신고자 2명의 점이 있어야 K 복원 가능
 *   잠금 2 (공개키): 신고 내용은 감독기관 공개키로 암호화 → 감독기관 비밀키 없이는 열람 불가
 *
 * 구현 방식: 하이브리드 암호화 (Web Crypto API)
 *   - 신고 내용 → AES-256-GCM 임시키 K로 암호화 → 암호문 C
 *   - 임시키 K → 감독기관 RSA-OAEP 공개키로 래핑 → encryptedK
 *   - 복호화: 감독기관 비밀키로 encryptedK 언래핑 → K → C 복호화
 *
 * NOTE: 감독기관 키페어는 현재 데모용으로 앱 시작 시 생성됩니다.
 *       실제 배포 시에는 감독기관이 키페어를 외부에서 생성·관리해야 합니다.
 */

// ── 타입 ──────────────────────────────────────────────────

export interface EncryptedBlob {
  /** base64 — 12바이트 IV ∥ AES-GCM 암호문 (연접) */
  C: string;
  /** base64 — RSA-OAEP로 래핑된 AES-256 원시 키 */
  encryptedK: string;
}

// ── 유틸 ──────────────────────────────────────────────────

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ── 키페어 생성 ───────────────────────────────────────────

/**
 * 감독기관 RSA-OAEP 키페어를 생성한다.
 *
 * 실제 배포 시에는 감독기관이 이 함수로 키를 직접 생성하고
 * 공개키만 앱에 배포해야 한다. 현재는 데모용으로 앱 내에서 생성한다.
 */
export async function generateSupervisorKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
}

// ── 데모용 싱글턴 키페어 ──────────────────────────────────
// 앱 시작 시 1회 생성. 새로고침 시 새 키쌍이 생성됨 — 데모 목적 전용.
const _demoKeyPairPromise: Promise<CryptoKeyPair> = generateSupervisorKeyPair();

/** 데모용 싱글턴 키페어를 반환한다. Step5Review 미리보기와 handleSubmit이 같은 키를 공유한다. */
export function getDemoKeyPair(): Promise<CryptoKeyPair> {
  return _demoKeyPairPromise;
}

// ── 암호화 ────────────────────────────────────────────────

/**
 * 평문을 감독기관 공개키로 암호화한다.
 *
 * 1. 임시 AES-256-GCM 키 K를 생성한다.
 * 2. 평문을 K로 암호화해 암호문 C를 만든다 (IV 12바이트 앞에 연접).
 * 3. K를 감독기관 RSA-OAEP 공개키로 래핑해 encryptedK를 만든다.
 * 4. { C, encryptedK }를 반환한다 — 서버로 전송되는 형태.
 */
export async function encryptForSupervisor(
  plaintext: string,
  publicKey: CryptoKey,
): Promise<EncryptedBlob> {
  // 1. 임시 AES-256-GCM 키 생성
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

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

  // 3. AES 키 원시값 내보내기 → RSA-OAEP 래핑
  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
  const wrappedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    rawAesKey,
  );
  const encryptedK = toBase64(wrappedKey);

  return { C, encryptedK };
}

// ── 복호화 ────────────────────────────────────────────────

/**
 * 감독기관 비밀키로 암호문을 복호화해 평문을 반환한다.
 *
 * 감독기관이 임계값 충족 알림을 수신한 후 이 함수로 신고 내용을 열람한다.
 */
export async function decryptFromSupervisor(
  blob: EncryptedBlob,
  privateKey: CryptoKey,
): Promise<string> {
  // 1. RSA-OAEP 언래핑 → AES 원시키 복원
  const rawAesKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    fromBase64(blob.encryptedK),
  );
  const aesKey = await crypto.subtle.importKey(
    "raw",
    rawAesKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  // 2. IV 분리 → AES-GCM 복호화
  const ivAndCipher = fromBase64(blob.C);
  const iv = ivAndCipher.slice(0, 12);
  const ciphertext = ivAndCipher.slice(12);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertext,
  );

  return new TextDecoder().decode(plainBuf);
}
