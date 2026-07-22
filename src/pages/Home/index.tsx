import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { MainLayout } from "@/components/layout";
import { Contacts } from "@/components/only-page";
import { Button, Typo, VStack } from "@/components/ui";

import s from "./index.module.scss";

export default function Home() {
  const navigate = useNavigate();

  return (
    <MainLayout gap={48} style={{ paddingTop: 64, paddingBottom: 80 }}>
      <section className={s.hero}>
        <div className={s.heroBadge}>
          <ShieldAlert size={20} />
          <Typo.Subtext>익명 신고 가능</Typo.Subtext>
        </div>

        <VStack align="center" gap={16} fullWidth>
          <h1 className={s.title}>직장 내 괴롭힘, 함께 드러냅니다</h1>
          <Typo.Body className={s.subtitle}>
            혼자 참지 마세요. 같은 피해를 입은 동료가 한 명만 더 있어도
            <br />
          직장안전이 전문가 검토의 계기를 만들어 드립니다.
          </Typo.Body>
        </VStack>

        <VStack align="center" gap={12} fullWidth className={s.actions}>
          <Button
            size="large"
            variant="primary"
            fullWidth
            onClick={() => navigate("/report")}
          >
            신고하기
          </Button>
          <Button
            size="medium"
            variant="secondary"
            fullWidth
            onClick={() => navigate("/guide")}
          >
            신고 안내 보기
          </Button>
        </VStack>
      </section>

      <Contacts />
    </MainLayout>
  );
}
