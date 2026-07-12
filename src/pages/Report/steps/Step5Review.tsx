import { Spacing, Typo, VStack } from "@/components/ui";
import { encryptMock } from "@/lib/crypto/mockEncrypt";
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

// ── 원문 / 암호문 split 패널 ─────────────────────────────
interface SplitPanelProps {
  lockLabel: string;        // 잠금 유형 (예: "tag 잠금")
  plainContent: string;     // 직렬화된 원문 (표시용)
  children: React.ReactNode; // 원문 패널 내용
}

function SplitPanel({ lockLabel, plainContent, children }: SplitPanelProps) {
  const cipher = plainContent.trim() ? encryptMock(plainContent) : "";

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

  // 각 그룹을 직렬화해 원문 → 암호문 변환 기준 문자열로 사용
  const matchingPlain = [
    matching.facilityId,
    matching.perpetratorName,
    matching.perpetratorRole,
    matching.perpetratorDescription ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  const incidentPlain = [
    incident.occurredAt,
    incident.locationDetail,
    incident.description,
    incident.evidenceFiles.map((f) => f.originalName).join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  const contactPlain = [
    REPORTER_TYPE_LABEL[reporterContact.reporterType],
    CONTACT_METHOD_LABEL[reporterContact.contactMethod],
    reporterContact.contactValue,
    reporterContact.consentToReveal ? "신원공개동의" : "비공개",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <VStack fullWidth>
      <Typo.Headline>입력 내용 검토</Typo.Headline>
      <Spacing size={8} />
      <Typo.Body>
        좌측은 입력한 원문, 우측은 서버로 전송될 암호문입니다.
        <br />
        <Typo.Subtext style={{ color: "#7D7D7D" }}>
          ※ 지금 암호화는 UI 확인용 더미입니다. 실제 암호는 Phase 1에서 적용됩니다.
        </Typo.Subtext>
      </Typo.Body>

      <Spacing size={24} />

      {/* 1. 시설·가해자 정보 — tag 잠금 */}
      <SplitPanel lockLabel="시설·가해자 정보 — tag 잠금" plainContent={matchingPlain}>
        <PlainRow label="시설 식별자" value={matching.facilityId} />
        <PlainRow label="가해자 이름" value={matching.perpetratorName} />
        <PlainRow label="직책·역할" value={matching.perpetratorRole} />
        {matching.perpetratorDescription && (
          <PlainRow label="추가 식별 정보" value={matching.perpetratorDescription} />
        )}
      </SplitPanel>

      {/* 2. 사건 내용 — 이중 잠금 */}
      <SplitPanel lockLabel="사건 내용 — 이중 잠금" plainContent={incidentPlain}>
        <PlainRow label="발생 일시" value={incident.occurredAt} />
        <PlainRow label="발생 장소" value={incident.locationDetail} />
        <PlainRow label="서술" value={incident.description} />
        <PlainRow
          label="첨부 파일"
          value={incident.evidenceFiles.map((f) => f.originalName).join(", ")}
        />
      </SplitPanel>

      {/* 3. 신고자 정보 — 신고자키 잠금 */}
      <SplitPanel lockLabel="신고자 정보 — 신고자키 잠금" plainContent={contactPlain}>
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
