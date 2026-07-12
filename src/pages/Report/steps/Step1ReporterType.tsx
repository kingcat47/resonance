import { Spacing, Typo, VStack } from "@/components/ui";
import type { ReporterType } from "@/types/report";

import s from "./step.module.scss";

interface Props {
  value: ReporterType;
  onChange: (value: ReporterType) => void;
}

const OPTIONS: { value: ReporterType; label: string; desc: string }[] = [
  { value: "self", label: "피해 당사자 본인", desc: "학대를 직접 경험하신 분" },
  { value: "coworker", label: "동료", desc: "같은 시설에서 근무하는 분" },
  { value: "family", label: "가족·보호자", desc: "피해자의 가족 또는 법정대리인" },
  { value: "other", label: "기타", desc: "그 외 학대를 목격하거나 인지한 분" },
];

export default function Step1ReporterType({ value, onChange }: Props) {
  return (
    <VStack fullWidth>
      <div className={s.stepHeader}>
        <Typo.Headline>신고자 유형을 선택해 주세요</Typo.Headline>
        <Spacing size={8} />
        <Typo.Body>선택하신 유형은 신고자키로 암호화되어 보호됩니다.</Typo.Body>
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
