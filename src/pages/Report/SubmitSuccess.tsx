import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button, Spacing, Typo, VStack } from "@/components/ui";

import s from "./styles.module.scss";

interface Props {
  /** 메모리에만 존재하는 1회성 토큰 */
  token: string;
}

export default function SubmitSuccess({ token }: Props) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      // 2초 후 피드백 초기화
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={s.successCard}>
      <ShieldCheck size={48} className={s.successIcon} strokeWidth={1.5} />

      <VStack gap={8} align="center" fullWidth>
        <Typo.Headline>신고가 접수되었습니다</Typo.Headline>
        <Typo.Body style={{ color: "#7D7D7D" }}>
          아래 재접속 토큰을 반드시 저장해 주세요.
        </Typo.Body>
      </VStack>

      {/* 매칭 안내 */}
      <div className={s.warningBox} style={{ background: "#f0f7ff", borderColor: "#bfdbfe" }}>
        <Typo.Body style={{ color: "#1e40af" }}>
          매칭은 유죄 판정이 아닙니다. 같은 가해자를 지목한 신고가 2건 이상 접수되면
          노무사·변호사 등 전문가 검토의 계기가 마련됩니다.
        </Typo.Body>
      </div>

      {/* 경고 박스 */}
      <div className={s.warningBox}>
        <Typo.BodyLarge style={{ fontWeight: 600, marginBottom: 6 }}>
          ⚠ 지금 저장하세요. 다시 볼 수 없습니다.
        </Typo.BodyLarge>
        <Typo.Body>
          이 토큰은 현재 화면에만 존재합니다. 새로고침하거나 페이지를 벗어나면
          영구적으로 사라집니다. 서버와 브라우저 어디에도 저장되지 않습니다.
        </Typo.Body>
      </div>

      {/* 토큰 표시 */}
      <div className={s.tokenBox}>
        <Typo.Caption style={{ color: "#7D7D7D" }}>재접속 토큰</Typo.Caption>
        <span className={s.tokenText}>{token}</span>
        <div className={s.copyFeedback}>
          {copied ? "✓ 복사되었습니다" : ""}
        </div>
        <Button variant="secondary" size="medium" onClick={handleCopy}>
          토큰 복사
        </Button>
      </div>

      <Spacing size={8} />

      <Button variant="tertiary" size="medium" onClick={() => navigate("/")}>
        홈으로
      </Button>
    </div>
  );
}
