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
          <h1 className={s.title}>노인학대, 함께 막아요</h1>
          <Typo.Body className={s.subtitle}>
            주변 어르신이 학대받고 있다면 망설이지 말고 신고해 주세요.
            <br />
            여러분의 작은 관심이 큰 도움이 됩니다.
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
