import { useReducer, useState } from "react";

import { MainLayout } from "@/components/layout";
import { Button, Spacing, Typo, VStack } from "@/components/ui";
import { encryptMock } from "@/lib/crypto/mockEncrypt";
import type { IncidentData, MatchingData, ReportDraft, ReporterContact } from "@/types/report";

import s from "./styles.module.scss";
import Step1ReporterType from "./steps/Step1ReporterType";
import Step2FacilityInfo from "./steps/Step2FacilityInfo";
import Step3Incident from "./steps/Step3Incident";
import Step4Contact from "./steps/Step4Contact";
import Step5Review from "./steps/Step5Review";
import SubmitSuccess from "./SubmitSuccess";

// ── 스텝 메타데이터 ──────────────────────────────────────
const STEPS = ["신고자 유형", "시설·가해자", "사건 내용", "연락처", "검토·제출"];

// ── 초기 draft ───────────────────────────────────────────
const initialDraft: ReportDraft = {
  matching: {
    facilityId: "",
    perpetratorName: "",
    perpetratorRole: "",
    perpetratorDescription: "",
  },
  incident: {
    occurredAt: "",
    locationDetail: "",
    description: "",
    evidenceFiles: [],
  },
  reporterContact: {
    reporterType: "other",
    contactMethod: "none",
    contactValue: "",
    consentToReveal: false,
  },
  // 더미 ID — 실제 제출 시 서버 세션과 연동 예정
  draftId: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
};

// ── Reducer ──────────────────────────────────────────────
type DraftAction =
  | { type: "UPDATE_MATCHING"; payload: Partial<MatchingData> }
  | { type: "UPDATE_INCIDENT"; payload: Partial<IncidentData> }
  | { type: "UPDATE_REPORTER_CONTACT"; payload: Partial<ReporterContact> };

function draftReducer(state: ReportDraft, action: DraftAction): ReportDraft {
  switch (action.type) {
    case "UPDATE_MATCHING":
      return { ...state, matching: { ...state.matching, ...action.payload } };
    case "UPDATE_INCIDENT":
      return { ...state, incident: { ...state.incident, ...action.payload } };
    case "UPDATE_REPORTER_CONTACT":
      return { ...state, reporterContact: { ...state.reporterContact, ...action.payload } };
  }
}

// ── 재접속 토큰 생성 ─────────────────────────────────────
// crypto.getRandomValues → 6바이트 → 12자리 hex → XXXX-XXXX-XXXX
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

// ── 스텝별 진행 가능 여부 ────────────────────────────────
function canProceed(step: number, draft: ReportDraft): boolean {
  switch (step) {
    case 0:
      // 유형은 항상 기본값이 있으므로 항상 통과
      return true;
    case 1:
      return (
        draft.matching.facilityId.trim() !== "" &&
        draft.matching.perpetratorName.trim() !== "" &&
        draft.matching.perpetratorRole.trim() !== ""
      );
    case 2:
      return (
        draft.incident.occurredAt.trim() !== "" &&
        draft.incident.locationDetail.trim() !== "" &&
        draft.incident.description.trim() !== ""
      );
    case 3:
      // 연락 안 함이면 값 없어도 통과, 아니면 값 필요
      return (
        draft.reporterContact.contactMethod === "none" ||
        draft.reporterContact.contactValue.trim() !== ""
      );
    default:
      return true;
  }
}

// ── 진행 표시줄 ──────────────────────────────────────────
function ProgressBar({ current }: { current: number }) {
  return (
    <div className={s.progressTrack}>
      {STEPS.map((label, idx) => (
        <div key={label} style={{ display: "contents" }}>
          <div className={s.progressItem}>
            <div
              className={[
                s.circle,
                idx === current ? s.circleActive : "",
                idx < current ? s.circleDone : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {idx < current ? "✓" : idx + 1}
            </div>
            <Typo.Caption
              className={[s.stepLabel, idx === current ? s.stepLabelActive : ""]
                .filter(Boolean)
                .join(" ")}
            >
              {label}
            </Typo.Caption>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={[s.connector, idx < current ? s.connectorDone : ""].filter(Boolean).join(" ")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── 메인 위저드 ──────────────────────────────────────────
export default function Report() {
  const [step, setStep] = useState(0);
  const [draft, dispatch] = useReducer(draftReducer, initialDraft);
  // null = 미제출 / string = 제출 완료 토큰 (메모리에만 존재)
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  // TODO: Phase 1에서 실제 암호화 및 서버 전송으로 교체
  function handleSubmit() {
    const encryptedPayload = {
      matching: encryptMock(JSON.stringify(draft.matching)),
      incident: encryptMock(JSON.stringify(draft.incident)),
      reporterContact: encryptMock(JSON.stringify(draft.reporterContact)),
      draftId: draft.draftId,
    };
    console.log("[공명] 가짜 암호화 draft (Phase 1에서 실제 암호로 교체):", encryptedPayload);
    setSubmittedToken(generateToken());
  }

  // 제출 완료 → 토큰 1회 표시 화면
  if (submittedToken !== null) {
    return (
      <MainLayout gap={32} style={{ paddingTop: 48, paddingBottom: 80 }}>
        <SubmitSuccess token={submittedToken} />
      </MainLayout>
    );
  }

  return (
    <MainLayout gap={32} style={{ paddingTop: 48, paddingBottom: 80 }}>
      <VStack gap={4} fullWidth>
        <Typo.Display>익명 신고</Typo.Display>
        <Typo.Body style={{ color: "var(--color-text-subtle, #7D7D7D)" }}>
          모든 정보는 브라우저에서 암호화된 후 전송됩니다.
        </Typo.Body>
      </VStack>

      <ProgressBar current={step} />

      <div className={s.card}>
        {step === 0 && (
          <Step1ReporterType
            value={draft.reporterContact.reporterType}
            onChange={(reporterType) =>
              dispatch({ type: "UPDATE_REPORTER_CONTACT", payload: { reporterType } })
            }
          />
        )}
        {step === 1 && (
          <Step2FacilityInfo
            value={draft.matching}
            onChange={(payload) => dispatch({ type: "UPDATE_MATCHING", payload })}
          />
        )}
        {step === 2 && (
          <Step3Incident
            value={draft.incident}
            onChange={(payload) => dispatch({ type: "UPDATE_INCIDENT", payload })}
          />
        )}
        {step === 3 && (
          <Step4Contact
            value={draft.reporterContact}
            onChange={(payload) => dispatch({ type: "UPDATE_REPORTER_CONTACT", payload })}
          />
        )}
        {step === 4 && <Step5Review draft={draft} />}
      </div>

      <div className={s.nav}>
        <Button
          variant="secondary"
          size="medium"
          onClick={() => setStep((n) => n - 1)}
          disabled={isFirst}
        >
          이전
        </Button>

        <Spacing size={0} />

        {isLast ? (
          <Button variant="primary" size="medium" onClick={handleSubmit}>
            제출하기
          </Button>
        ) : (
          <Button
            variant="primary"
            size="medium"
            onClick={() => setStep((n) => n + 1)}
            disabled={!canProceed(step, draft)}
          >
            다음
          </Button>
        )}
      </div>
    </MainLayout>
  );
}
