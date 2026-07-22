import { useReducer, useState } from "react";

import { MainLayout } from "@/components/layout";
import { Button, Spacing, Typo, VStack } from "@/components/ui";
import { submitReport } from "@/lib/api/reports";
import { encryptForSupervisor } from "@/lib/crypto/encrypt";
import { deriveKviaOPRF, normalizePerpetratorInput } from "@/lib/crypto/oprf";
import { makeShare, randomShareX } from "@/lib/crypto/shamir";
import { getSupervisorPublicKey } from "@/lib/crypto/supervisorKey";
import { makeTag } from "@/lib/crypto/tag";
import type { IncidentData, MatchingData, ReportDraft, ReporterContact } from "@/types/report";

import s from "./styles.module.scss";
import Step1ReporterType from "./steps/Step1ReporterType";
import Step2FacilityInfo from "./steps/Step2FacilityInfo";
import Step3Incident from "./steps/Step3Incident";
import Step4Contact from "./steps/Step4Contact";
import Step5Review from "./steps/Step5Review";
import SubmitSuccess from "./SubmitSuccess";

// ── 스텝 메타데이터 ──────────────────────────────────────
const STEPS = ["신고자 유형", "회사·가해자", "괴롭힘 내용", "연락처", "검토·제출"];

// ── 초기 draft ───────────────────────────────────────────
const initialDraft: ReportDraft = {
  matching: {
    companyId: "",
    perpetratorName: "",
    perpetratorDept: "",
  },
  incident: {
    occurredAt: "",
    locationDetail: "",
    harassmentTypes: [],
    perpetratorRelation: "superior",
    description: "",
    recurrence: { duration: "", frequency: "" },
    evidenceFiles: [],
  },
  reporterContact: {
    reporterType: "other",
    contactMethod: "none",
    contactValue: "",
    consentToReveal: false,
  },
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
        draft.matching.companyId.trim() !== "" &&
        draft.matching.perpetratorName.trim() !== "" &&
        draft.matching.perpetratorDept.trim() !== ""
      );
    case 2:
      return (
        draft.incident.occurredAt.trim() !== "" &&
        draft.incident.locationDetail.trim() !== "" &&
        draft.incident.description.trim() !== ""
      );
    case 3:
      // 전화/이메일 선택 + 값 입력 + 동의 체크 모두 필수
      return (
        (draft.reporterContact.contactMethod === "phone" ||
          draft.reporterContact.contactMethod === "email") &&
        draft.reporterContact.contactValue.trim() !== "" &&
        draft.reporterContact.consentToReveal === true
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
  const [submitPending, setSubmitPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Step5 진입 시 OPRF로 미리 유도한 K — 제출 시 재사용 (OPRF 1회)
  const [cachedK, setCachedK] = useState<bigint | null>(null);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  async function goToStep(next: number) {
    setStep(next);
    if (next === 4 && cachedK === null) {
      const { companyId, perpetratorName, perpetratorDept } = draft.matching;
      const normalized = normalizePerpetratorInput(companyId, perpetratorName, perpetratorDept);
      try {
        const K = await deriveKviaOPRF(normalized);
        setCachedK(K);
      } catch {
        // 미리보기 실패 시 무시 — 제출 시 재시도
      }
    }
  }

  async function handleSubmit() {
    setSubmitPending(true);
    setSubmitError(null);
    try {
      // 1. OPRF로 K 유도 — Step5 진입 시 캐싱된 값 재사용
      const { companyId, perpetratorName, perpetratorDept } = draft.matching;
      const normalized = normalizePerpetratorInput(companyId, perpetratorName, perpetratorDept);
      const tag = makeTag(companyId, perpetratorName, perpetratorDept);
      const K = cachedK ?? await deriveKviaOPRF(normalized);

      // 2. Shamir share — x는 crypto 랜덤 (타임스탬프 충돌 방지)
      const x = randomShareX();
      const share = makeShare(K, x);

      // 3. incident / reporterContact — AES-256-GCM + RSA-OAEP 이중 잠금
      //    bundle = randomKey XOR K → RSA(bundle)
      //    → RSA 비밀키 없이는 bundle 불가, K 없이는 randomKey 불가
      const publicKey = await getSupervisorPublicKey();
      const [incidentBlob, contactBlob] = await Promise.all([
        encryptForSupervisor(JSON.stringify(draft.incident), publicKey, K),
        encryptForSupervisor(JSON.stringify(draft.reporterContact), publicKey, K),
      ]);

      const payload = {
        matching: {
          tag,
          share: { x: share.x.toString(16), y: share.y.toString(16) },
        },
        incident: incidentBlob,
        reporterContact: contactBlob,
      };

      // 3. 백엔드에 실제 전송
      const result = await submitReport(payload);

      // matched 여부는 내부 디버그용으로만 기록 — 신고자 화면에 노출하지 않음
      console.log("[직장안전] 신고 접수 완료:", result.id, "| matched:", result.matched);

      setSubmittedToken(generateToken());
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSubmitPending(false);
    }
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
        <Typo.Display>직장 내 괴롭힘 익명 신고</Typo.Display>
        <Typo.Body style={{ color: "var(--color-text-subtle, #7D7D7D)" }}>
          모든 정보는 브라우저에서 암호화된 후 전송됩니다. 서버는 내용을 볼 수 없습니다.
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
        {step === 4 && <Step5Review draft={draft} K={cachedK} />}
      </div>

      {submitError && (
        <div className={s.errorBox}>
          <Typo.Body style={{ color: "var(--color-error, #d32f2f)" }}>{submitError}</Typo.Body>
        </div>
      )}

      <div className={s.nav}>
        <Button
          variant="secondary"
          size="medium"
          onClick={() => setStep((n) => n - 1)}
          disabled={isFirst || submitPending}
        >
          이전
        </Button>

        <Spacing size={0} />

        {isLast ? (
          <Button variant="primary" size="medium" onClick={handleSubmit} pending={submitPending}>
            제출하기
          </Button>
        ) : (
          <Button
            variant="primary"
            size="medium"
            onClick={() => goToStep(step + 1)}
            disabled={!canProceed(step, draft)}
          >
            다음
          </Button>
        )}
      </div>
    </MainLayout>
  );
}
