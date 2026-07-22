import { Spacing, Typo, VStack } from "@/components/ui";
import type { ReporterType } from "@/types/report";

import s from "./step.module.scss";

interface Props {
  value: ReporterType;
  onChange: (value: ReporterType) => void;
}

const OPTIONS: { value: ReporterType; label: string; desc: string }[] = [
  { value: "self", label: "피해 당사자 본인", desc: "괴롭힘을 직접 경험하신 분" },
  { value: "coworker", label: "동료", desc: "같은 직장에서 목격하거나 인지한 분" },
  { value: "family", label: "제3자 목격자", desc: "피해자의 가족·지인 또는 외부 관계자" },
  { value: "other", label: "기타", desc: "그 외 괴롭힘 사실을 알고 있는 분" },
];

export default function Step1ReporterType({ value, onChange }: Props) {
  return (
    <VStack fullWidth>
      <div className={s.stepHeader}>
        <Typo.Headline>신고자 유형을 선택해 주세요</Typo.Headline>
        <Spacing size={8} />
        <Typo.Body>선택하신 유형은 암호화되어 보호됩니다. 신고 내용과 함께 서버에 평문으로 전달되지 않습니다.</Typo.Body>
      </div>

      <VStack gap={12} fullWidth>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${s.option} ${value === opt.value ? s.optionSelected : ""}`}
            onClick={() => onChange(opt.value)}
          >
            <Typo.BodyLarge>{opt.label}</Typo.BodyLarge>
            <Typo.Caption>{opt.desc}</Typo.Caption>
          </button>
        ))}
      </VStack>
    </VStack>
  );
}
