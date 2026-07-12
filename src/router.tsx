import { createBrowserRouter } from "react-router-dom";

import { Home } from "@/pages";
import { RootLayout } from "@/components/layout";

const Router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Home /> },
    ],
  },
  {
    path: "/auth/login",
    element: <div>Login</div>,
  },
]);

export default Router;
