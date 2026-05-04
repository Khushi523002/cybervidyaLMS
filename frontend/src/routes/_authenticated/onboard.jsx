import { createFileRoute } from "@tanstack/react-router";
import { OnboardPage } from "../../pages/OnboardPage";
export const Route = createFileRoute("/_authenticated/onboard")({ component: OnboardPage });
