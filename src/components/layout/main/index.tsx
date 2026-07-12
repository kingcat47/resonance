import type { CSSProperties, ReactNode } from "react";

import s from "./styles.module.scss";

interface Props {
  children: ReactNode;
  gap?: number;
  style?: CSSProperties;
}

const MainLayout = ({ children, gap, style }: Props) => {
  return (
    <div
      className={s.mainLayout}
      style={{ gap: gap ? `${gap}px` : undefined, ...style }}
    >
      {children}
    </div>
  );
};

export default MainLayout;
