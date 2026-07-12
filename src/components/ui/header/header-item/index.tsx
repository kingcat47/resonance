import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import Typo from "../../typo";

import s from "./styles.module.scss";

interface HeaderItemProps {
  text: string;
  icon: LucideIcon;
  isActive?: boolean;
  href: string;
}

export default function HeaderItem({
  text,
  icon: Icon,
  isActive = false,
  href,
}: HeaderItemProps) {
  return (
    <Link to={href} className={`${s.container} ${isActive ? s.active : s.inactive}`}>
      <Icon className={s.icon} />
      <Typo.Body className={s.text}>{text}</Typo.Body>
    </Link>
  );
}
