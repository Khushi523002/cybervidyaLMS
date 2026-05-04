import { createFileRoute } from "@tanstack/react-router";
import { ReviewsPage } from "../../pages/ReviewsPage";

export const Route = createFileRoute("/_authenticated/reviews")({
  component: ReviewsPage,
});
