import { useState } from "react";

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
];

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function validatePhone(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (!/^01[0-9]/.test(digits)) return "올바른 휴대폰 번호를 입력해 주세요";
  if (digits.length < 10) return "번호가 너무 짧습니다";
  return "";
}

function validateEmail(v: string): string {
  if (v.length === 0) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "올바른 이메일 형식이 아닙니다";
}

export default function Step4Contact({ value, onChange }: Props) {
  const [touched, setTouched] = useState(false);

  const handleContactMethodChange = (method: ContactMethod) => {
    setTouched(false);
    onChange({ contactMethod: method, contactValue: "" });
  };

  const handlePhoneChange = (raw: string) => {
    onChange({ contactValue: formatPhone(raw) });
  };

  const validationError =
    !touched
      ? ""
      : value.contactMethod === "phone"
        ? validatePhone(value.contactValue)
        : validateEmail(value.contactValue);

  return (
    <VStack fullWidth>
      <Typo.Headline>연락처 정보</Typo.Headline>
      <Spacing size={8} />
      <Typo.Body>
        연락처는 암호화되어 보호됩니다. 본인이 동의하기 전까지 누구도 열람할 수 없습니다.
      </Typo.Body>
      <Spacing size={8} />
      <Typo.Body style={{ color: "var(--color-text-brand-heavy, #1A56DB)" }}>
        전화번호 또는 이메일 중 하나를 필수로 입력해 주세요. 매칭 성사 시 전문가가 연락드립니다.
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
            inputMode={value.contactMethod === "phone" ? "numeric" : "email"}
            placeholder={value.contactMethod === "phone" ? "010-0000-0000" : "example@email.com"}
            fullWidth
            value={value.contactValue}
            onChange={(e) =>
              value.contactMethod === "phone"
                ? handlePhoneChange(e.target.value)
                : onChange({ contactValue: e.target.value })
            }
            onBlur={() => setTouched(true)}
            error={validationError}
          />
        </>
      )}

      <Spacing size={24} />

      <Checkbox
        checked={value.consentToReveal}
        onCheckedChange={(checked) => onChange({ consentToReveal: checked })}
        label="매칭 성사 시 전문가에게 신원 공개에 동의합니다"
        description="체크하지 않으면 연락처는 영구적으로 비공개 상태를 유지합니다."
      />
    </VStack>
  );
}
