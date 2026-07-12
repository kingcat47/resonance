import { File } from "lucide-react";
import type { ChangeEvent } from "react";

import { Input, Spacing, Typo, VStack } from "@/components/ui";
import type { EvidenceFileMeta, IncidentData } from "@/types/report";

import s from "./step.module.scss";

interface Props {
  value: IncidentData;
  onChange: (payload: Partial<IncidentData>) => void;
}

export default function Step3Incident({ value, onChange }: Props) {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const metas: EvidenceFileMeta[] = files.map((f) => ({
      originalName: f.name,
      mimeType: f.type,
      sizeBytes: f.size,
      // 더미 ID — 실제 암호화 업로드 시 교체됨
      clientRefId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }));
    onChange({ evidenceFiles: [...value.evidenceFiles, ...metas] });
    // input 초기화 (같은 파일 재선택 허용)
    e.target.value = "";
  };

  return (
    <VStack fullWidth>
      <Typo.Headline>사건 내용을 입력해 주세요</Typo.Headline>
      <Spacing size={8} />
      <Typo.Body>
        이 내용은 이중 잠금으로 보호됩니다. 임계값이 충족되기 전까지 아무도 열람할 수 없습니다.
      </Typo.Body>

      <Spacing size={24} />

      <VStack gap={16} fullWidth>
        <Input
          label="사건 발생 일시"
          type="datetime-local"
          fullWidth
          value={value.occurredAt}
          onChange={(e) => onChange({ occurredAt: e.target.value })}
        />
        <Input
          label="발생 장소 상세"
          placeholder="예) 3층 302호 욕실"
          fullWidth
          value={value.locationDetail}
          onChange={(e) => onChange({ locationDetail: e.target.value })}
        />

        <div style={{ width: "100%" }}>
          <label className={s.textareaLabel}>사건 서술</label>
          <textarea
            className={s.textarea}
            placeholder="발생한 학대 내용을 구체적으로 서술해 주세요."
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>

        <div style={{ width: "100%" }}>
          <label className={s.fileLabel}>증거 파일 첨부 (선택)</label>
          <input type="file" multiple accept="image/*,video/*,.pdf" onChange={handleFileChange} />
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
