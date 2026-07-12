import type { FC, ReactNode, CSSProperties } from "react";

import styles from "./styles.module.scss";

// 정렬 방향 const
export const FlexAlign = {
  Start: "start",
  Center: "center",
  End: "end",
  Stretch: "stretch",
} as const;

export type FlexAlign = typeof FlexAlign[keyof typeof FlexAlign];

// justify const
export const FlexJustify = {
  Start: "start",
  Center: "center",
  End: "end",
  Between: "between",
  Around: "around",
  Evenly: "evenly",
} as const;

export type FlexJustify = typeof FlexJustify[keyof typeof FlexJustify];

// 공통 Stack props
interface StackProps {
  children: ReactNode;
  align?: FlexAlign;
  justify?: FlexJustify;
  gap?: number;
  fullWidth?: boolean;
  fullHeight?: boolean;
  wrap?: boolean;
  className?: string;
  style?: CSSProperties;
}

// HStack 컴포넌트 (가로 배치)
export const HStack: FC<StackProps> = ({
  children,
  align = FlexAlign.Start,
  justify = FlexJustify.Start,
  gap = 0,
  fullWidth = false,
  fullHeight = false,
  wrap = false,
  className,
  style,
  ...props
}) => {
  const alignClass = styles[`align-${align}`];
  const justifyClass = styles[`justify-${justify}`];
  const gapClass = gap > 0 ? styles[`gap-${gap}`] : "";
  const widthClass = fullWidth ? styles.fullWidth : "";
  const heightClass = fullHeight ? styles.fullHeight : "";
  const wrapClass = wrap ? styles.wrap : "";

  const combinedClassName = [
    styles.hstack,
    alignClass,
    justifyClass,
    gapClass,
    widthClass,
    heightClass,
    wrapClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={combinedClassName}
      style={{ ...style, gap: gap > 0 ? `${gap}px` : undefined }}
      {...props}
    >
      {children}
    </div>
  );
};

// VStack 컴포넌트 (세로 배치)
export const VStack: FC<StackProps> = ({
  children,
  align = FlexAlign.Start,
  justify = FlexJustify.Start,
  gap = 0,
  fullWidth = false,
  fullHeight = false,
  wrap = false,
  className,
  style,
  ...props
}) => {
  const alignClass = styles[`align-${align}`];
  const justifyClass = styles[`justify-${justify}`];
  const gapClass = gap > 0 ? styles[`gap-${gap}`] : "";
  const widthClass = fullWidth ? styles.fullWidth : "";
  const heightClass = fullHeight ? styles.fullHeight : "";
  const wrapClass = wrap ? styles.wrap : "";

  const combinedClassName = [
    styles.vstack,
    alignClass,
    justifyClass,
    gapClass,
    widthClass,
    heightClass,
    wrapClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={combinedClassName}
      style={{ ...style, gap: gap > 0 ? `${gap}px` : undefined }}
      {...props}
    >
      {children}
    </div>
  );
};
