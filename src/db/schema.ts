import { boolean, integer, pgTable, serial, text, timestamp, varchar, uniqueIndex, index } from "drizzle-orm/pg-core";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 160 }).notNull(),
  tagline: varchar("tagline", { length: 240 }).notNull().default(""),
  description: text("description").notNull().default(""),
  category: varchar("category", { length: 60 }).notNull().default("Arcade"),
  tags: text("tags").notNull().default(""),
  accent: varchar("accent", { length: 30 }).notNull().default("#d4fb54"),
  accent2: varchar("accent2", { length: 30 }).notNull().default("#769333"),
  glyph: varchar("glyph", { length: 12 }).notNull().default("K"),
  coverUrl: text("cover_url"),
  source: varchar("source", { length: 20 }).notNull().default("local"),
  url: text("url"),
  orientation: varchar("orientation", { length: 20 }).notNull().default("landscape"),
  controls: text("controls").notNull().default("Keyboard + Mouse"),
  weight: varchar("weight", { length: 20 }).notNull().default("light"),
  status: varchar("status", { length: 20 }).notNull().default("soon"),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  plays: integer("plays").notNull().default(0),
  hypes: integer("hypes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("games_category_status_idx").on(t.category, t.status), index("games_sort_idx").on(t.sortOrder, t.id)]);
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  gameSlug: varchar("game_slug", { length: 120 }).notNull(),
  player: varchar("player", { length: 40 }).notNull().default("Player"),
  score: integer("score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("scores_game_score_idx").on(t.gameSlug, t.score)]);
export type Score = typeof scores.$inferSelect;

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 254 }).notNull(),
  gameSlug: varchar("game_slug", { length: 120 }).notNull().default("all"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("subscriber_email_game_idx").on(t.email, t.gameSlug)]);

export const appMigrations = pgTable("app_migrations", {
  name: varchar("name", { length: 100 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
