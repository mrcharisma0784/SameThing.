import { createServerFn } from "@tanstack/react-start";

const disabled = () => {
  throw new Error(
    "Test Users is currently unavailable. Test User applications and access management are disabled.",
  );
};

export const submitTestUserApplication = createServerFn({ method: "POST" }).handler(disabled);
export const getMyTestUserApplications = createServerFn({ method: "GET" }).handler(disabled);
export const adminListTestUserApplications = createServerFn({ method: "GET" }).handler(disabled);
export const adminReviewTestUserApplication = createServerFn({ method: "POST" }).handler(disabled);
