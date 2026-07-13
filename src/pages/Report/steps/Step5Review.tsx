import { useEffect, useState } from "react";

import { Spacing, Typo, VStack } from "@/components/ui";
import { encryptForSupervisor, getDemoKeyPair } from "@/lib/crypto/encrypt";
import type { EncryptedBlob } from "@/lib/crypto/encrypt";
import { makeShare } from "@/lib/crypto/shamir";
import { makeTag } from "@/lib/crypto/tag";
import type { ReportDraft } from "@/types/report";

import s from "./step.module.scss";

interface Props {
  draft: ReportDraft;
}

// ── 라벨 맵 ─────────────────────────────────────────────
const REPORTER_TYPE_LABEL: Record<string, string> = {
  self: "피해 당사자 본인",
  coworker: "동료",
  family: "가족·보호자",
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
  lockLabel: string;         // 잠금 유형
  serverData: string;        // 우측 패널 — 서버로 전송될 실제 데이터
  children: React.ReactNode; // 좌측 패널 — 원문
}

function SplitPanel({ lockLabel, serverData, children }: SplitPanelProps) {
  const cipher = serverData;

  return (
    <div className={s.reviewSection}>
      <Typo.Caption className={s.reviewSectionTitle}>{lockLabel}</Typo.Caption>
      <div className={s.splitPanel}>
        {/* 전체 너비 배너 — writing-mode 미사용, 뒤집힘 없음 */}
        <div className={s.splitBanner}> 서버는 오른쪽만 봅니다</div>

        {/* 컬럼 레이블 행 (50/50 flex) */}
        <div className={s.splitColHeaders}>
          <span className={s.splitColHeader}>원문</span>
          <span className={s.splitColHeader}>서버 전송</span>
        </div>

        {/* 내용 행 (50/50 flex) */}
        <div className={s.splitContent}>
          <div className={s.plainPanel}>{children}</div>
          <div className={s.splitLine} />
          <div className={s.cipherPanel}>
            {/* Typo.Caption as="pre"는 SubTypoProps 타입 제한으로 불가 → <pre> 직접 사용 */}
            {cipher ? (
              <pre className={s.cipherText}>{cipher}</pre>
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
export default function Step5Review({ draft }: Props) {
  const { matching, incident, reporterContact } = draft;

  // ── matching — 실제 tag + share (동기) ────────────────
  const matchingServerData = (() => {
    const { facilityId, perpetratorName, perpetratorRole } = matching;
    if (!facilityId.trim() || !perpetratorName.trim() || !perpetratorRole.trim()) return "";
    const tag = makeTag(facilityId, perpetratorName, perpetratorRole);
    // 미리보기용 x = 1 (실제 제출 시에는 Date.now() 기반 x 사용)
    const share = makeShare(tag, 1n);
    return `tag:\n${tag}\n\nshare.x: ${share.x}\nshare.y (hex):\n${share.y.toString(16)}`;
  })();

  // ── incident / contact — AES-GCM + RSA-OAEP (비동기) ─
  const [incidentServerData, setIncidentServerData] = useState("암호화 중…");
  const [contactServerData, setContactServerData] = useState("암호화 중…");

  useEffect(() => {
    getDemoKeyPair().then(({ publicKey }) =>
      encryptForSupervisor(JSON.stringify(incident), publicKey).then((blob) =>
        setIncidentServerData(formatBlob(blob)),
      ),
    );
  }, []);

  useEffect(() => {
    getDemoKeyPair().then(({ publicKey }) =>
      encryptForSupervisor(JSON.stringify(reporterContact), publicKey).then((blob) =>
        setContactServerData(formatBlob(blob)),
      ),
    );
  }, []);

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

      {/* 1. 시설·가해자 정보 — tag 잠금 (실제 Shamir 매칭 코어) */}
      <SplitPanel lockLabel="시설·가해자 정보 — tag 잠금" serverData={matchingServerData}>
        <PlainRow label="시설 식별자" value={matching.facilityId} />
        <PlainRow label="가해자 이름" value={matching.perpetratorName} />
        <PlainRow label="직책·역할" value={matching.perpetratorRole} />
        {matching.perpetratorDescription && (
          <PlainRow label="추가 식별 정보" value={matching.perpetratorDescription} />
        )}
      </SplitPanel>

      {/* 2. 사건 내용 — 이중 잠금 */}
      <SplitPanel lockLabel="사건 내용 — 이중 잠금" serverData={incidentServerData}>
        <PlainRow label="발생 일시" value={incident.occurredAt} />
        <PlainRow label="발생 장소" value={incident.locationDetail} />
        <PlainRow label="서술" value={incident.description} />
        <PlainRow
          label="첨부 파일"
          value={incident.evidenceFiles.map((f) => f.originalName).join(", ")}
        />
      </SplitPanel>

      {/* 3. 신고자 정보 — 신고자키 잠금 */}
      <SplitPanel lockLabel="신고자 정보 — 신고자키 잠금" serverData={contactServerData}>
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
