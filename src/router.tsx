import { createBrowserRouter } from "react-router-dom";

import { RootLayout } from "@/components/layout";
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
]);

export default Router;
