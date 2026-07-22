import { createBrowserRouter } from "react-router-dom";

import { RootLayout } from "@/components/layout";
import Admin from "@/pages/Admin";
import Home from "@/pages/Home";
import Report from "@/pages/Report";

const Router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "report", element: <Report /> },
      { path: "guide", element: <div>신고 안내 (준비 중)</div> },
    ],
  },
  // 감독기관 콘솔 — RootLayout 밖, 헤더 없음
  { path: "/admin", element: <Admin /> },
]);

export default Router;
