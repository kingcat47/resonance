import { Shield } from "lucide-react";
import { useState } from "react";

import { Button, Spacing, Typo, VStack } from "@/components/ui";
import type { AdminMatchedCase, AdminReport } from "@/lib/api/admin";
import { fetchAdminMatches } from "@/lib/api/admin";
import { decryptFromSupervisor } from "@/lib/crypto/encrypt";
import { recoverK } from "@/lib/crypto/shamir";
import { importPrivateKeyFromJwk } from "@/lib/crypto/supervisorKey";
import type { HarassmentType, IncidentData, PerpRelation, ReporterContact } from "@/types/report";

import s from "./styles.module.scss";

// ── 표시용 헬퍼 ────────────────────────────────────────
const HARASSMENT_LABEL: Record<HarassmentType, string> = {
  verbal: "폭언·욕설·모욕",
  exclusion: "따돌림·집단 무시",
  unfair: "부당 지시·과도한 업무",
  physical: "신체적 폭력",
  sexual: "성적 괴롭힘",
  privacy: "사생활 침해",
  other: "기타",
};

const RELATION_LABEL: Record<PerpRelation, string> = {
  superior: "상사",
  peer: "동료",
  employer: "사용자(사업주)",
  other: "기타",
};

function truncateTag(tag: string) {
  return tag.slice(0, 16) + "…" + tag.slice(-8);
}

// ── 복호화된 신고 1건 표시 ─────────────────────────────
interface DecryptedReport {
  index: number;
  incident: IncidentData;
  contact: ReporterContact;
}

function ReportView({ r }: { r: DecryptedReport }) {
  const { incident, contact } = r;
  const Row = ({ k, v }: { k: string; v: string }) =>
    v ? (
      <div className={s.fieldRow}>
        <span className={s.fieldKey}>{k}</span>
        <span className={s.fieldVal}>{v}</span>
      </div>
    ) : null;

  return (
    <div className={s.reportBlock}>
      <div className={s.reportBlockHeader}>신고 #{r.index}</div>
      <div className={s.reportBlockBody}>
        <Typo.Caption style={{ color: "var(--color-text-subtle)", fontWeight: 600, marginBottom: 4 }}>
          — 사건 내용
        </Typo.Caption>
        <Row k="발생 일시" v={incident.occurredAt} />
        <Row k="발생 장소" v={incident.locationDetail} />
        <Row k="행위자 관계" v={RELATION_LABEL[incident.perpetratorRelation] ?? incident.perpetratorRelation} />
        <Row
          k="행위 유형"
          v={incident.harassmentTypes.map((t) => HARASSMENT_LABEL[t] ?? t).join(", ")}
        />
        <Row k="서술" v={incident.description} />
        <Row k="지속 기간" v={incident.recurrence?.duration ?? ""} />
        <Row k="빈도" v={incident.recurrence?.frequency ?? ""} />
        {incident.evidenceFiles?.length > 0 && (
          <div className={s.fieldRow} style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
            <span className={s.fieldKey}>증거 파일 ({incident.evidenceFiles.length}개)</span>
            {incident.evidenceFiles.map((f) => {
              const src = `data:${f.mimeType};base64,${f.dataBase64}`;
              const isImage = f.mimeType.startsWith("image/");
              return (
                <div key={f.clientRefId} style={{ width: "100%" }}>
                  <Typo.Caption style={{ color: "var(--color-text-subtle)", marginBottom: 4, display: "block" }}>
                    {f.originalName} ({(f.sizeBytes / 1024).toFixed(1)} KB)
                  </Typo.Caption>
                  {isImage ? (
                    <img
                      src={src}
                      alt={f.originalName}
                      style={{ maxWidth: "100%", maxHeight: 400, borderRadius: 8, border: "1px solid #e8e8e8" }}
                    />
                  ) : (
                    <a href={src} download={f.originalName} style={{ color: "#d4a017", fontWeight: 600 }}>
                      다운로드: {f.originalName}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Spacing size={8} />
        <Typo.Caption style={{ color: "var(--color-text-subtle)", fontWeight: 600, marginBottom: 4 }}>
          — 신고자 연락처
        </Typo.Caption>
        <Row k="연락 수단" v={contact.contactMethod === "none" ? "제공 안 함" : contact.contactMethod} />
        {contact.contactMethod !== "none" && <Row k="연락처" v={contact.contactValue} />}
        <Row k="신원 공개 동의" v={contact.consentToReveal ? "동의" : "비동의"} />
      </div>
    </div>
  );
}

// ── 매칭 케이스 1건 ────────────────────────────────────
interface MatchCaseCardProps {
  mc: AdminMatchedCase;
  privateKey: CryptoKey;
}

function MatchCaseCard({ mc, privateKey }: MatchCaseCardProps) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "decrypting" }
    | { status: "done"; reports: DecryptedReport[]; shamirK: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  async function handleDecrypt() {
    setState({ status: "decrypting" });
    try {
      // 잠금 1 (Shamir): x가 다른 두 share를 찾아 K 복원
      const s0 = mc.reports[0];
      let s1 = mc.reports[1];
      for (let i = 2; i < mc.reports.length; i++) {
        if (mc.reports[i].shareX !== s0.shareX) { s1 = mc.reports[i]; break; }
      }
      console.log("[Admin] share0 - x:", s0.shareX?.slice(0, 8) + "...", "y:", s0.shareY?.slice(0, 8) + "...");
      console.log("[Admin] share1 - x:", s1.shareX?.slice(0, 8) + "...", "y:", s1.shareY?.slice(0, 8) + "...");
      const share0 = { x: BigInt("0x" + s0.shareX), y: BigInt("0x" + s0.shareY) };
      const share1 = { x: BigInt("0x" + s1.shareX), y: BigInt("0x" + s1.shareY) };
      const K = recoverK([share0, share1]);
      console.log("[Admin] Shamir 보간 완료 - K:", K.toString(16).slice(0, 16) + "...");

      // 잠금 2 (RSA) + XOR: K와 RSA 비밀키로 각 신고 복호화
      const decrypted = await Promise.all(
        mc.reports.map(async (r: AdminReport, i: number) => {
          const [incidentJson, contactJson] = await Promise.all([
            decryptFromSupervisor({ C: r.incidentC, encryptedK: r.incidentEncryptedK }, privateKey, K),
            decryptFromSupervisor({ C: r.contactC, encryptedK: r.contactEncryptedK }, privateKey, K),
          ]);
          return {
            index: i + 1,
            incident: JSON.parse(incidentJson) as IncidentData,
            contact: JSON.parse(contactJson) as ReporterContact,
          };
        }),
      );

      setState({ status: "done", reports: decrypted, shamirK: K.toString(16) });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "복호화 실패. 비밀키 또는 신고 데이터를 확인하세요.",
      });
    }
  }

  return (
    <div className={s.matchCard}>
      <div className={s.matchHeader}>
        <VStack gap={4}>
          <Typo.Caption className={s.matchTag}>tag: {truncateTag(mc.tag)}</Typo.Caption>
        </VStack>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className={s.matchBadge}>✓ 매칭 {mc.count}건</span>
          {state.status === "idle" && (
            <Button size="medium" variant="primary" onClick={handleDecrypt}>
              복호화
            </Button>
          )}
          {state.status === "decrypting" && (
            <Button size="medium" variant="primary" pending>복호화 중</Button>
          )}
        </div>
      </div>

      <div className={s.matchBody}>
        {state.status === "idle" && (
          <Typo.Body style={{ color: "var(--color-text-subtle)" }}>
            복호화 버튼을 누르면 브라우저에서 비밀키로 신고 내용을 복원합니다.
            서버로 비밀키가 전송되지 않습니다.
          </Typo.Body>
        )}
        {state.status === "done" && (
          <div className={s.decryptResult}>
            <div className={s.shamirBox}>
              ✓ Shamir 임계값 충족 — K (라그랑주 보간 복원값):<br />
              0x{state.shamirK}
            </div>
            {state.reports.map((r) => <ReportView key={r.index} r={r} />)}
          </div>
        )}
        {state.status === "error" && (
          <div className={s.decryptError}>⚠ {state.message}</div>
        )}
      </div>
    </div>
  );
}

// ── 비밀키 입력 패널 (실제 배포 모드) ─────────────────
interface PrivateKeyPanelProps {
  onKeyReady: (key: CryptoKey) => void;
}

function PrivateKeyPanel({ onKeyReady }: PrivateKeyPanelProps) {
  const [jwkInput, setJwkInput] = useState("");
  const [status, setStatus] = useState<"idle" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleImport() {
    if (!jwkInput.trim()) return;
    try {
      const key = await importPrivateKeyFromJwk(jwkInput.trim());
      setStatus("ready");
      setErrorMsg("");
      onKeyReady(key);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "키 가져오기 실패");
    }
  }

  return (
    <div className={s.keyCard}>
      <VStack gap={8} fullWidth>
        <div className={s.keyStatus}>
          <div className={`${s.dot} ${status === "ready" ? s.dotReady : status === "error" ? s.dotError : s.dotNone}`} />
          <VStack gap={2}>
            <Typo.Body style={{ fontWeight: 600 }}>
              {status === "ready" ? "비밀키 로드됨 (메모리에만 존재)" : "감독기관 RSA 비밀키 필요"}
            </Typo.Body>
            <Typo.Caption style={{ color: "var(--color-text-subtle)" }}>
              비밀키는 브라우저 메모리에만 존재하며 어디에도 저장되지 않습니다
            </Typo.Caption>
          </VStack>
        </div>

        {status !== "ready" && (
          <>
            <textarea
              className={s.jwkTextarea}
              placeholder='{"kty":"RSA","n":"...","d":"..."} 형태의 JWK 비밀키를 붙여넣으세요'
              value={jwkInput}
              onChange={(e) => setJwkInput(e.target.value)}
              rows={4}
            />
            {errorMsg && (
              <Typo.Caption style={{ color: "var(--color-error, #d32f2f)" }}>{errorMsg}</Typo.Caption>
            )}
            <Button variant="primary" size="medium" onClick={handleImport} disabled={!jwkInput.trim()}>
              비밀키 가져오기
            </Button>
          </>
        )}
      </VStack>
    </div>
  );
}

// ── 메인 콘솔 페이지 ───────────────────────────────────
export default function Admin() {
  const [adminKey, setAdminKey] = useState("resonance-admin-dev");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<AdminMatchedCase[] | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);

  async function handleFetch() {
    setLoading(true);
    setError(null);
    setMatches(null);
    try {
      const res = await fetchAdminMatches(adminKey);
      setMatches(res.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.page}>
      {/* 헤더 */}
      <div className={s.header}>
        <div className={`${s.badge} ${s.badgeAdmin}`}>
          <Shield size={14} />
          감독기관 전용
        </div>
        <Typo.Display>직장안전 — 감독기관 콘솔</Typo.Display>
        <Spacing size={8} />
        <Typo.Body style={{ color: "var(--color-text-subtle)" }}>
          복호화는 이 브라우저 안에서만 이루어집니다. 비밀키는 서버로 전송되지 않습니다.
        </Typo.Body>
      </div>

      {/* 비밀키 패널 */}
      <PrivateKeyPanel onKeyReady={setPrivateKey} />

      <Spacing size={24} />

      {/* 조회 */}
      <VStack gap={8} fullWidth>
        <Typo.Body style={{ fontWeight: 600 }}>관리자 키</Typo.Body>
        <div className={s.queryRow}>
          <input
            className={s.adminKeyInput}
            type="text"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="resonance-admin-dev"
          />
          <Button
            variant="primary"
            size="medium"
            onClick={handleFetch}
            pending={loading}
            disabled={!privateKey}
          >
            매칭 목록 조회
          </Button>
        </div>
        {!privateKey && (
          <Typo.Caption style={{ color: "var(--color-text-subtle)" }}>
            비밀키를 먼저 로드해야 조회할 수 있습니다
          </Typo.Caption>
        )}
      </VStack>

      {error && (
        <>
          <Spacing size={12} />
          <div className={s.error}>{error}</div>
        </>
      )}

      {/* 결과 */}
      {matches !== null && privateKey && (
        <>
          <Spacing size={32} />
          <VStack gap={4} fullWidth>
            <Typo.Headline>
              매칭된 사건
              <span style={{ color: "var(--color-text-subtle)", fontWeight: 400, marginLeft: 8 }}>
                {matches.length}건
              </span>
            </Typo.Headline>
            <Typo.Caption style={{ color: "var(--color-text-subtle)" }}>
              임계값(2건 이상) 충족 — 비밀키로 복호화 가능
            </Typo.Caption>
          </VStack>

          <Spacing size={16} />

          {matches.length === 0 ? (
            <div className={s.empty}>
              <Typo.Body>아직 매칭된 사건이 없습니다.</Typo.Body>
              <Typo.Caption style={{ marginTop: 4 }}>같은 가해자로 2건 이상 신고해야 매칭됩니다.</Typo.Caption>
            </div>
          ) : (
            <VStack gap={16} fullWidth>
              {matches.map((mc) => (
                <MatchCaseCard key={mc.tag} mc={mc} privateKey={privateKey} />
              ))}
            </VStack>
          )}
        </>
      )}
    </div>
  );
}
