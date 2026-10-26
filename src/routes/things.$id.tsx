import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/things/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/thing/$id",
      params: { id: params.id },
      replace: true,
    });
  },
});
