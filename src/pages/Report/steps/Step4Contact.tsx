import { Checkbox, Input, Spacing, Typo, VStack } from "@/components/ui";
import type { ContactMethod, ReporterContact } from "@/types/report";

import s from "./step.module.scss";

interface Props {
  value: ReporterContact;
  onChange: (payload: Partial<ReporterContact>) => void;
}

const CONTACT_OPTIONS: { value: ContactMethod; label: string; desc: string }[] = [
  { value: "phone", label: "전화번호", desc: "문자·전화로 연락받기" },
  { value: "email", label: "이메일", desc: "이메일로 연락받기" },
  { value: "none", label: "연락처 제공 안 함", desc: "완전 익명으로 신고" },
];

export default function Step4Contact({ value, onChange }: Props) {
  const handleContactMethodChange = (method: ContactMethod) => {
    onChange({ contactMethod: method, contactValue: "" });
  };

  return (
    <VStack fullWidth>
      <Typo.Headline>연락처 정보</Typo.Headline>
      <Spacing size={8} />
      <Typo.Body>
        연락처는 신고자키로 암호화됩니다. 본인이 동의하기 전까지 누구도 열람할 수 없습니다.
      </Typo.Body>

      <Spacing size={24} />

      <VStack gap={12} fullWidth>
        {CONTACT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${s.option} ${value.contactMethod === opt.value ? s.optionSelected : ""}`}
            onClick={() => handleContactMethodChange(opt.value)}
          >
            <Typo.BodyLarge>{opt.label}</Typo.BodyLarge>
            <Typo.Caption>{opt.desc}</Typo.Caption>
          </button>
        ))}
      </VStack>

      {value.contactMethod !== "none" && (
        <>
          <Spacing size={16} />
          <Input
            label={value.contactMethod === "phone" ? "전화번호" : "이메일"}
            type={value.contactMethod === "phone" ? "tel" : "email"}
            placeholder={
              value.contactMethod === "phone"
                ? "010-0000-0000"
                : "example@email.com"
            }
            fullWidth
            value={value.contactValue}
            onChange={(e) => onChange({ contactValue: e.target.value })}
          />
        </>
      )}

      <Spacing size={24} />

      <Checkbox
        checked={value.consentToReveal}
        onCheckedChange={(checked) => onChange({ consentToReveal: checked })}
        label="임계값 충족 시 신원 공개에 동의합니다"
        description="체크하지 않으면 연락처는 영구적으로 비공개 상태를 유지합니다."
      />
    </VStack>
  );
}
