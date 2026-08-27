import { createFileRoute } from "@tanstack/react-router";
import { TeamPortalPage } from "@/components/team/TeamPortalPage";
export const Route = createFileRoute("/team/players/new")({
  component: () => <TeamPortalPage view="new-player" />,
});
