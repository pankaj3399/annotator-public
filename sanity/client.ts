import { createClient } from "next-sanity";

export const client = createClient({
  projectId: "d1xmepf1",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
});