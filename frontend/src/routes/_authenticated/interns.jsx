import { createFileRoute } from "@tanstack/react-router";
import { InternsPage } from "../../pages/InternsPage";

export const Route = createFileRoute("/_authenticated/interns")({
  component: InternsPage,
});
