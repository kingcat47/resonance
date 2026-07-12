import { useReducer, useState } from "react";

import { MainLayout } from "@/components/layout";
import { Button, Spacing, Typo, VStack } from "@/components/ui";
import type { IncidentData, MatchingData, ReportDraft, ReporterContact } from "@/types/report";

import s from "./styles.module.scss";
import Step1ReporterType from "./steps/Step1ReporterType";
import Step2FacilityInfo from "./steps/Step2FacilityInfo";
import Step3Incident from "./steps/Step3Incident";
import Step4Contact from "./steps/Step4Contact";
import Step5Review from "./steps/Step5Review";

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

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

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
          <Button variant="primary" size="medium" disabled>
            제출 (준비 중)
          </Button>
        ) : (
          <Button variant="primary" size="medium" onClick={() => setStep((n) => n + 1)}>
            다음
          </Button>
        )}
      </div>
    </MainLayout>
  );
}
