import { createFileRoute } from "@tanstack/react-router";
import { TeamPortalPage } from "@/components/team/TeamPortalPage";
export const Route = createFileRoute("/team/players")({
  component: () => <TeamPortalPage view="players" />,
});
