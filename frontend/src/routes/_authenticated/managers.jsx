import { createFileRoute } from "@tanstack/react-router";
import { ManagersPage } from "../../pages/ManagersPage";
export const Route = createFileRoute("/_authenticated/managers")({ component: ManagersPage });
