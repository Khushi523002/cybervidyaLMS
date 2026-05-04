import { createFileRoute } from "@tanstack/react-router";
import { PerformancePage } from "../../pages/PerformancePage";
export const Route = createFileRoute("/_authenticated/performance")({ component: PerformancePage });
