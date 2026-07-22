import { useRef } from "react";

import { Input, Spacing, Typo, VStack } from "@/components/ui";
import type { MatchingData } from "@/types/report";

interface Props {
  value: MatchingData;
  onChange: (payload: Partial<MatchingData>) => void;
}

export default function Step2FacilityInfo({ value, onChange }: Props) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const focusNext = (idx: number) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      refs[idx + 1]?.current?.focus();
    }
  };

  return (
    <VStack fullWidth>
      <Typo.Headline>회사 및 가해자 정보</Typo.Headline>
      <Spacing size={8} />
      <Typo.Body>
        이 정보는 암호화된 태그로만 변환되어 서버에 전달됩니다. 이름·회사 원문은 서버가 볼 수 없습니다.
      </Typo.Body>
      <Spacing size={8} />
      <Typo.Body style={{ color: "var(--color-text-brand-heavy, #1A56DB)", fontWeight: 600 }}>
        같은 가해자를 다른 분도 지목하면 매칭됩니다. 회사명·이름·직위를 정확하게 입력해 주세요.
      </Typo.Body>

      <Spacing size={24} />

      <VStack gap={16} fullWidth>
        <Input
          ref={refs[0]}
          label="회사 식별자"
          placeholder="예) 회사명 또는 사업자등록번호"
          fullWidth
          value={value.companyId}
          onChange={(e) => onChange({ companyId: e.target.value })}
          onKeyDown={focusNext(0)}
        />
        <Input
          ref={refs[1]}
          label="가해자 이름"
          placeholder="예) 홍길동"
          fullWidth
          value={value.perpetratorName}
          onChange={(e) => onChange({ perpetratorName: e.target.value })}
          onKeyDown={focusNext(1)}
        />
        <Input
          ref={refs[2]}
          label="가해자 직위·부서"
          placeholder="예) 팀장, 인사팀"
          fullWidth
          value={value.perpetratorDept}
          onChange={(e) => onChange({ perpetratorDept: e.target.value })}
          onKeyDown={focusNext(2)}
        />
        <Input
          ref={refs[3]}
          label="추가 식별 정보 (선택)"
          placeholder="동명이인 구분에 도움이 되는 특징 등"
          fullWidth
          value={value.perpetratorDescription ?? ""}
          onChange={(e) => onChange({ perpetratorDescription: e.target.value })}
        />
      </VStack>
    </VStack>
  );
}
