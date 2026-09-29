import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const fiction = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/fiction" }),
  schema: z.object({
    title: z.string(),
    englishTitle: z.string().optional(),
    subtitle: z.string(),
    excerpt: z.string(),
    cover: z.string(),
    order: z.number().int().positive(),
    charCount: z.number().int().nonnegative(),
    theme: z.enum(["deepblue", "whitebird", "winter", "emptybox", "mountainsea", "magician", "railway"]),
    publication: z.array(z.object({
      label: z.string(),
      value: z.string()
    })).default([]),
    music: z.object({
      title: z.string(),
      artist: z.string(),
      url: z.url(),
      artwork: z.url().optional()
    }).optional()
  })
});

const drafts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/drafts" }),
  schema: z.object({
    title: z.string(),
    englishTitle: z.string().optional(),
    subtitle: z.string(),
    excerpt: z.string(),
    cover: z.string(),
    order: z.number().int().positive(),
    charCount: z.number().int().nonnegative(),
    theme: z.enum(["winter", "emptybox", "mountainsea", "magician", "railway", "cafe", "dust", "southcity"]),
    publication: z.array(z.object({
      label: z.string(),
      value: z.string()
    })).default([]),
    music: z.object({
      title: z.string(),
      artist: z.string(),
      url: z.url(),
      artwork: z.url().optional()
    }).optional()
  })
});

const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: z.object({
    sourceId: z.string(),
    title: z.string(),
    category: z.string(),
    date: z.string(),
    status: z.string(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    order: z.number().int().nonnegative()
  })
});

export const collections = { fiction, drafts, notes };
