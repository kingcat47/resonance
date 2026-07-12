import { Input, Spacing, Typo, VStack } from "@/components/ui";
import type { MatchingData } from "@/types/report";

interface Props {
  value: MatchingData;
  onChange: (payload: Partial<MatchingData>) => void;
}

export default function Step2FacilityInfo({ value, onChange }: Props) {
  return (
    <VStack fullWidth>
      <Typo.Headline>시설 및 가해자 정보</Typo.Headline>
      <Spacing size={8} />
      <Typo.Body>
        이 정보는 tag로 변환되어 임계값 매칭에만 사용됩니다. 서버는 원문을 볼 수 없습니다.
      </Typo.Body>

      <Spacing size={24} />

      <VStack gap={16} fullWidth>
        <Input
          label="시설 식별자"
          placeholder="예) 요양원 이름 또는 사업자 등록번호"
          fullWidth
          value={value.facilityId}
          onChange={(e) => onChange({ facilityId: e.target.value })}
        />
        <Input
          label="가해자 이름"
          placeholder="예) 홍길동"
          fullWidth
          value={value.perpetratorName}
          onChange={(e) => onChange({ perpetratorName: e.target.value })}
        />
        <Input
          label="가해자 직책·역할"
          placeholder="예) 요양보호사, 시설장"
          fullWidth
          value={value.perpetratorRole}
          onChange={(e) => onChange({ perpetratorRole: e.target.value })}
        />
        <Input
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
