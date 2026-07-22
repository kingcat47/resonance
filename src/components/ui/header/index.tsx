import { BookOpen, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import HeaderItem from "@/components/ui/header/header-item";
import Typo from "@/components/ui/typo";

import s from "./styles.module.scss";

export default function Header() {
  const { pathname } = useLocation();

  return (
    <header className={s.header}>
      <div className={s.header_content}>
        <div className={s.right}>
          <Link to="/" className={s.logoLink}>
            <Typo.Headline className={s.logoText}>직장안전</Typo.Headline>
          </Link>
          <nav className={s.items} aria-label="주요 메뉴">
            <HeaderItem
              text="홈"
              icon={Home}
              href="/"
              isActive={pathname === "/"}
            />
            <HeaderItem
              text="신고 안내"
              icon={BookOpen}
              href="/guide"
              isActive={pathname.startsWith("/guide")}
            />
          </nav>
        </div>
      </div>
    </header>
  );
}