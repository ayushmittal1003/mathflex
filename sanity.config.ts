"use client";

// Sanity Studio, mounted at /studio (src/app/studio/[[...tool]]/page.tsx). Schemas live in sanity/.
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemaTypes";
import { apiVersion, dataset, projectId } from "./src/lib/sanity/env";

export default defineConfig({
  name: "mathflex",
  title: "Mathflex Blog",
  basePath: "/studio",
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [structureTool(), visionTool({ defaultApiVersion: apiVersion })],
});
