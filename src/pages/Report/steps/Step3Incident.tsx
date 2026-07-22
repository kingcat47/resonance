import { File } from "lucide-react";
import type { ChangeEvent } from "react";
import { useRef } from "react";

import { Input, Spacing, Typo, VStack } from "@/components/ui";
import type { EvidenceFileMeta, HarassmentType, IncidentData, PerpRelation } from "@/types/report";

import s from "./step.module.scss";

interface Props {
  value: IncidentData;
  onChange: (payload: Partial<IncidentData>) => void;
}

const HARASSMENT_OPTIONS: { value: HarassmentType; label: string }[] = [
  { value: "verbal", label: "폭언·욕설·모욕" },
  { value: "exclusion", label: "따돌림·집단 무시" },
  { value: "unfair", label: "부당 지시·과도한 업무" },
  { value: "physical", label: "신체적 폭력" },
  { value: "sexual", label: "성적 괴롭힘" },
  { value: "privacy", label: "사생활 침해" },
  { value: "other", label: "기타" },
];

const RELATION_OPTIONS: { value: PerpRelation; label: string; desc: string }[] = [
  { value: "superior", label: "상사", desc: "직속 상관 또는 임원" },
  { value: "peer", label: "동료", desc: "같은 직급 또는 유사 직급" },
  { value: "employer", label: "사용자", desc: "사업주 또는 대표" },
  { value: "other", label: "기타", desc: "그 외 관계" },
];

export default function Step3Incident({ value, onChange }: Props) {
  const locationRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const frequencyRef = useRef<HTMLInputElement>(null);

  const focusNext = (ref: React.RefObject<HTMLInputElement | null>) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ref.current?.focus();
    }
  };

  const toggleHarassmentType = (type: HarassmentType) => {
    const current = value.harassmentTypes;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onChange({ harassmentTypes: next });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const metas: EvidenceFileMeta[] = await Promise.all(
      files.map(async (f) => {
        const buffer = await f.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // 청크 단위로 btoa — 대용량 파일에서 스택오버플로 방지
        let binary = "";
        const chunk = 8192;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        return {
          originalName: f.name,
          mimeType: f.type,
          sizeBytes: f.size,
          clientRefId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          dataBase64: btoa(binary),
        };
      }),
    );
    onChange({ evidenceFiles: [...value.evidenceFiles, ...metas] });
    e.target.value = "";
  };

  return (
    <VStack fullWidth>
      <Typo.Headline>괴롭힘 내용을 입력해 주세요</Typo.Headline>
      <Spacing size={8} />
      <Typo.Body>
        이 내용은 이중 잠금으로 보호됩니다. 임계값이 충족되기 전까지 아무도 열람할 수 없습니다.
      </Typo.Body>

      <Spacing size={24} />

      <VStack gap={20} fullWidth>
        {/* 발생 일시 */}
        <Input
          label="발생 일시"
          type="datetime-local"
          fullWidth
          value={value.occurredAt}
          onChange={(e) => onChange({ occurredAt: e.target.value })}
        />

        {/* 발생 장소 */}
        <Input
          ref={locationRef}
          label="발생 장소"
          placeholder="예) 팀장실, 회의실, 업무용 단체 채팅방"
          fullWidth
          value={value.locationDetail}
          onChange={(e) => onChange({ locationDetail: e.target.value })}
          onKeyDown={focusNext(durationRef)}
        />

        {/* 행위자와의 관계 */}
        <div style={{ width: "100%" }}>
          <label className={s.textareaLabel}>행위자와의 관계</label>
          <Spacing size={8} />
          <VStack gap={8} fullWidth>
            {RELATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${s.option} ${value.perpetratorRelation === opt.value ? s.optionSelected : ""}`}
                onClick={() => onChange({ perpetratorRelation: opt.value })}
              >
                <Typo.BodyLarge>{opt.label}</Typo.BodyLarge>
                <Typo.Caption>{opt.desc}</Typo.Caption>
              </button>
            ))}
          </VStack>
        </div>

        {/* 행위 유형 — 복수 선택 */}
        <div style={{ width: "100%" }}>
          <label className={s.textareaLabel}>행위 유형 (복수 선택 가능)</label>
          <Spacing size={8} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {HARASSMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${s.option} ${value.harassmentTypes.includes(opt.value) ? s.optionSelected : ""}`}
                style={{ width: "auto", padding: "8px 16px" }}
                onClick={() => toggleHarassmentType(opt.value)}
              >
                <Typo.Body>{opt.label}</Typo.Body>
              </button>
            ))}
          </div>
        </div>

        {/* 구체적 행위 서술 */}
        <div style={{ width: "100%" }}>
          <label className={s.textareaLabel}>구체적 행위 내용 서술 (최대 500자)</label>
          <textarea
            className={s.textarea}
            placeholder="언제, 어디서, 어떤 말과 행동이 있었는지 구체적으로 서술해 주세요."
            maxLength={500}
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
          <Typo.Caption style={{ color: "var(--color-text-subtle)", textAlign: "right", display: "block", marginTop: 4 }}>
            {value.description.length} / 500자
          </Typo.Caption>
        </div>

        {/* 반복성 */}
        <Input
          ref={durationRef}
          label="지속 기간 (선택)"
          placeholder="예) 약 3개월, 2024년 1월부터"
          fullWidth
          value={value.recurrence.duration}
          onChange={(e) =>
            onChange({ recurrence: { ...value.recurrence, duration: e.target.value } })
          }
          onKeyDown={focusNext(frequencyRef)}
        />
        <Input
          ref={frequencyRef}
          label="횟수 또는 빈도 (선택)"
          placeholder="예) 주 2~3회, 총 5회 이상"
          fullWidth
          value={value.recurrence.frequency}
          onChange={(e) =>
            onChange({ recurrence: { ...value.recurrence, frequency: e.target.value } })
          }
        />

        {/* 증거 파일 */}
        <div style={{ width: "100%" }}>
          <label className={s.fileLabel}>증거 파일 첨부 (선택)</label>
          <Typo.Caption style={{ color: "var(--color-text-subtle)", display: "block", marginBottom: 8 }}>
            문자·카톡·이메일 캡처, 녹음 파일 등
          </Typo.Caption>
          <input
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.docx,.xlsx"
            onChange={handleFileChange}
          />
          {value.evidenceFiles.length > 0 && (
            <div className={s.fileList}>
              {value.evidenceFiles.map((f) => (
                <div key={f.clientRefId} className={s.fileItem}>
                  <File size={14} />
                  <span>{f.originalName}</span>
                  <Typo.Caption>({(f.sizeBytes / 1024).toFixed(1)} KB)</Typo.Caption>
                </div>
              ))}
            </div>
          )}
        </div>
      </VStack>
    </VStack>
  );
}
