import { createFileRoute } from "@tanstack/react-router";
import { ModulesPage } from "../../../pages/ModulesPage";
export const Route = createFileRoute("/_authenticated/modules/$moduleId/$topicId")({ component: ModulesPage });
