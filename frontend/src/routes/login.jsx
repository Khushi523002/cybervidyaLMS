import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "../pages/LoginPage";

export const Route = createFileRoute("/login")({
  beforeLoad({ context }) {
    if (context.auth?.token) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});
