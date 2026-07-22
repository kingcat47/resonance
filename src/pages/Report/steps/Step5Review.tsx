import { useEffect, useState } from "react";

import { Spacing, Typo, VStack } from "@/components/ui";
import { encryptForSupervisor } from "@/lib/crypto/encrypt";
import type { EncryptedBlob } from "@/lib/crypto/encrypt";
import { getSupervisorPublicKey } from "@/lib/crypto/supervisorKey";
import { makeTag } from "@/lib/crypto/tag";
import type { ReportDraft } from "@/types/report";

import s from "./step.module.scss";

interface Props {
  draft: ReportDraft;
  K: bigint | null;
}

// ── 라벨 맵 ─────────────────────────────────────────────
const REPORTER_TYPE_LABEL: Record<string, string> = {
  self: "피해 당사자 본인",
  coworker: "동료",
  family: "제3자 목격자",
  other: "기타",
};

const CONTACT_METHOD_LABEL: Record<string, string> = {
  phone: "전화번호",
  email: "이메일",
  none: "제공 안 함",
};

// ── 원문 한 행 ───────────────────────────────────────────
function PlainRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.reviewRow}>
      <Typo.Caption className={s.reviewKey}>{label}</Typo.Caption>
      <Typo.Body className={s.reviewValue}>
        {value || <span className={s.emptyBadge}>미입력</span>}
      </Typo.Body>
    </div>
  );
}

// ── blob 표시 포맷 ────────────────────────────────────────
function formatBlob(blob: EncryptedBlob): string {
  const trunc = (s: string) => (s.length > 64 ? s.slice(0, 64) + "…" : s);
  return `[AES-256-GCM + RSA-2048-OAEP]\n\nC:\n${trunc(blob.C)}\n\nencryptedK:\n${trunc(blob.encryptedK)}`;
}

// ── 원문 / 서버전송 split 패널 ───────────────────────────
interface SplitPanelProps {
  lockLabel: string;
  serverData: string;
  children: React.ReactNode;
}

function SplitPanel({ lockLabel, serverData, children }: SplitPanelProps) {
  return (
    <div className={s.reviewSection}>
      <Typo.Caption className={s.reviewSectionTitle}>{lockLabel}</Typo.Caption>
      <div className={s.splitPanel}>
        <div className={s.splitBanner}> 서버는 오른쪽만 봅니다</div>
        <div className={s.splitColHeaders}>
          <span className={s.splitColHeader}>원문</span>
          <span className={s.splitColHeader}>서버 전송</span>
        </div>
        <div className={s.splitContent}>
          <div className={s.plainPanel}>{children}</div>
          <div className={s.splitLine} />
          <div className={s.cipherPanel}>
            {serverData ? (
              <pre className={s.cipherText}>{serverData}</pre>
            ) : (
              <Typo.Caption className={s.cipherEmpty}>— 입력값 없음 —</Typo.Caption>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────
export default function Step5Review({ draft, K }: Props) {
  const { matching, incident, reporterContact } = draft;

  // ── matching — tag 실제값, share는 K 로드 후 표시 ─────
  const matchingServerData = (() => {
    const { companyId, perpetratorName, perpetratorDept } = matching;
    if (!companyId.trim() || !perpetratorName.trim() || !perpetratorDept.trim()) return "";
    const tag = makeTag(companyId, perpetratorName, perpetratorDept);
    if (K === null) return `tag (HMAC-SHA256):\n${tag}\n\nshare: OPRF 연산 중…`;
    return `tag (HMAC-SHA256):\n${tag}\n\nK (OPRF 유도값, 앞 32자):\n${K.toString(16).slice(0, 32)}…\n\nshare: 제출 시 랜덤 x로 생성`;
  })();

  // ── incident / contact — K로 실제 암호화 ──────────────
  const [incidentServerData, setIncidentServerData] = useState("OPRF 연산 중…");
  const [contactServerData, setContactServerData] = useState("OPRF 연산 중…");

  useEffect(() => {
    if (K === null) return;
    getSupervisorPublicKey()
      .then((publicKey) => encryptForSupervisor(JSON.stringify(incident), publicKey, K))
      .then((blob) => setIncidentServerData(formatBlob(blob)))
      .catch(() => setIncidentServerData("암호화 실패 — 서버 연결 확인"));
  }, [K]);

  useEffect(() => {
    if (K === null) return;
    getSupervisorPublicKey()
      .then((publicKey) => encryptForSupervisor(JSON.stringify(reporterContact), publicKey, K))
      .then((blob) => setContactServerData(formatBlob(blob)))
      .catch(() => setContactServerData("암호화 실패 — 서버 연결 확인"));
  }, [K]);

  return (
    <VStack fullWidth>
      <Typo.Headline>입력 내용 검토</Typo.Headline>
      <Spacing size={8} />
      <Typo.Body>
        좌측은 입력한 원문, 우측은 서버로 전송될 실제 암호문입니다.
        <br />
        <Typo.Subtext style={{ color: "#7D7D7D" }}>
          가해자: tag+share (Shamir) · 사건/연락처: AES-256-GCM + RSA-2048-OAEP
        </Typo.Subtext>
      </Typo.Body>

      <Spacing size={24} />

      <SplitPanel lockLabel="회사·가해자 정보 — tag 잠금" serverData={matchingServerData}>
        <PlainRow label="회사 식별자" value={matching.companyId} />
        <PlainRow label="가해자 이름" value={matching.perpetratorName} />
        <PlainRow label="직위·부서" value={matching.perpetratorDept} />
      </SplitPanel>

      <SplitPanel lockLabel="사건 내용 — 이중 잠금 (미리보기)" serverData={incidentServerData}>
        <PlainRow label="발생 일시" value={incident.occurredAt} />
        <PlainRow label="발생 장소" value={incident.locationDetail} />
        <PlainRow label="행위자-피해자 관계" value={incident.perpetratorRelation} />
        <PlainRow label="행위 유형" value={incident.harassmentTypes.join(", ")} />
        <PlainRow label="서술" value={incident.description} />
        <PlainRow label="지속 기간" value={incident.recurrence.duration} />
        <PlainRow label="빈도" value={incident.recurrence.frequency} />
      </SplitPanel>

      <SplitPanel lockLabel="신고자 정보 — 신고자키 잠금 (미리보기)" serverData={contactServerData}>
        <PlainRow label="신고자 유형" value={REPORTER_TYPE_LABEL[reporterContact.reporterType]} />
        <PlainRow label="연락 수단" value={CONTACT_METHOD_LABEL[reporterContact.contactMethod]} />
        {reporterContact.contactMethod !== "none" && (
          <PlainRow label="연락처" value={reporterContact.contactValue} />
        )}
        <PlainRow
          label="신원 공개 동의"
          value={reporterContact.consentToReveal ? "동의함" : "동의 안 함"}
        />
      </SplitPanel>
    </VStack>
  );
}
