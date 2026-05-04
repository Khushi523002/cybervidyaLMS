import { createFileRoute } from "@tanstack/react-router";
import { ApprovalsPage } from "../../pages/ApprovalsPage";

export const Route = createFileRoute("/_authenticated/approvals")({
  component: ApprovalsPage,
});
