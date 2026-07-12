import { Spacing, Typo, VStack } from "@/components/ui";
import type { ReportDraft } from "@/types/report";

import s from "./step.module.scss";

interface Props {
  draft: ReportDraft;
}

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.reviewRow}>
      <Typo.Caption className={s.reviewKey}>{label}</Typo.Caption>
      <Typo.Body className={s.reviewValue}>
        {value || <span className={s.emptyBadge}>미입력</span>}
      </Typo.Body>
    </div>
  );
}

export default function Step5Review({ draft }: Props) {
  const { matching, incident, reporterContact } = draft;

  return (
    <VStack fullWidth>
      <Typo.Headline>입력 내용 검토</Typo.Headline>
      <Spacing size={8} />
      <Typo.Body>
        아래 내용을 확인하세요. 제출 시 각 그룹은 별도로 암호화됩니다.
      </Typo.Body>

      <Spacing size={24} />

      {/* MatchingData — tag 잠금 */}
      <div className={s.reviewSection}>
        <Typo.Caption className={s.reviewSectionTitle}>시설·가해자 정보 (tag 잠금)</Typo.Caption>
        <Row label="시설 식별자" value={matching.facilityId} />
        <Row label="가해자 이름" value={matching.perpetratorName} />
        <Row label="직책·역할" value={matching.perpetratorRole} />
        {matching.perpetratorDescription && (
          <Row label="추가 식별 정보" value={matching.perpetratorDescription} />
        )}
      </div>

      {/* IncidentData — 이중 잠금 */}
      <div className={s.reviewSection}>
        <Typo.Caption className={s.reviewSectionTitle}>사건 내용 (이중 잠금)</Typo.Caption>
        <Row label="발생 일시" value={incident.occurredAt} />
        <Row label="발생 장소" value={incident.locationDetail} />
        <Row label="서술" value={incident.description} />
        <Row
          label="첨부 파일"
          value={
            incident.evidenceFiles.length > 0
              ? incident.evidenceFiles.map((f) => f.originalName).join(", ")
              : ""
          }
        />
      </div>

      {/* ReporterContact — 신고자키 잠금 */}
      <div className={s.reviewSection}>
        <Typo.Caption className={s.reviewSectionTitle}>신고자 정보 (신고자키 잠금)</Typo.Caption>
        <Row label="신고자 유형" value={REPORTER_TYPE_LABEL[reporterContact.reporterType]} />
        <Row label="연락 수단" value={CONTACT_METHOD_LABEL[reporterContact.contactMethod]} />
        {reporterContact.contactMethod !== "none" && (
          <Row label="연락처" value={reporterContact.contactValue} />
        )}
        <Row label="신원 공개 동의" value={reporterContact.consentToReveal ? "동의함" : "동의 안 함"} />
      </div>
    </VStack>
  );
}
