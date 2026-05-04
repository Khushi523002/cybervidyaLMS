import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "../../pages/ProfilePage";

export const Route = createFileRoute("/_authenticated/users/$userId")({
  component: ProfilePage,
});
