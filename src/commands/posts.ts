import { Command } from "commander";
import { apiFail, fail, makeClient, printJson, table, type GlobalOpts } from "../client.js";
import type { paths } from "../generated/content.js";

type ListQuery = NonNullable<paths["/content/posts"]["get"]["parameters"]["query"]>;

export function postsCommand(globals: () => GlobalOpts): Command {
  const posts = new Command("posts").description("Browse posts");

  posts
    .command("list")
    .description("List posts")
    .option("--limit <n>", "items per page (1-50)")
    .option("--tags <tags>", "comma-separated tag slugs to filter by")
    .option("--search <query>", "search query")
    .option("--featured <bool>", 'filter by featured flag ("true"/"false")')
    .option("--read-status <status>", "filter by read status: all, read, unread (requires auth)")
    .option("--cursor <cursor>", "pagination cursor from a previous page")
    .action(async (o: Record<string, string>) => {
      const g = globals();
      const query: ListQuery = {};
      if (o.limit !== undefined) {
        const limit = Number(o.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 50) fail("--limit must be an integer between 1 and 50");
        query.limit = limit;
      }
      if (o.tags) query.tags = o.tags;
      if (o.search) query.search = o.search;
      if (o.cursor) query.cursor = o.cursor;
      if (o.featured) {
        if (o.featured !== "true" && o.featured !== "false") fail('--featured must be "true" or "false"');
        query.featured = o.featured;
      }
      if (o.readStatus) {
        if (!["all", "read", "unread"].includes(o.readStatus)) fail('--read-status must be "all", "read" or "unread"');
        query.read_status = o.readStatus as ListQuery["read_status"];
      }

      const { data, error, response } = await makeClient(g).GET("/content/posts", { params: { query } });
      if (!data) apiFail(error, response);
      if (g.json) return printJson(data);

      const rows = (data.items ?? []).map((p) => [p.published_at.slice(0, 10), p.slug, p.title]);
      console.log(table(["PUBLISHED", "SLUG", "TITLE"], rows));
      if (data.has_more && data.next_cursor) {
        console.log(`\nMore available: tstation posts list --cursor '${data.next_cursor}'`);
      }
    });

  posts
    .command("get")
    .description("Get a single post by ID or slug")
    .argument("<id-or-slug>", "post UUID or slug")
    .option("--formats <formats>", "comma-separated content formats: plaintext (default) and/or lexical")
    .action(async (id: string, o: Record<string, string>) => {
      const g = globals();
      const { data, error, response } = await makeClient(g).GET("/content/posts/{id}", {
        params: { path: { id }, query: o.formats ? { formats: o.formats } : {} },
      });
      if (!data) apiFail(error, response);
      if (g.json) return printJson(data);

      console.log(data.title);
      console.log("=".repeat(data.title.length));
      if (data.author) console.log(`Author:    ${data.author}`);
      console.log(`Published: ${data.published_at.slice(0, 10)}`);
      if (data.reading_time !== undefined) console.log(`Reading:   ${data.reading_time} min`);
      if (data.tags?.length) console.log(`Tags:      ${data.tags.join(", ")}`);
      console.log();
      if (data.plaintext) {
        console.log(data.plaintext);
      } else if (data.visibility && data.visibility !== "public") {
        console.log('(members-only content — run "tstation auth login" with an API key that has access)');
      } else {
        console.log("(no content returned)");
      }
    });

  posts
    .command("tags")
    .description("List available tags")
    .action(async () => {
      const g = globals();
      const { data, error, response } = await makeClient(g).GET("/content/posts/tags");
      if (!data) apiFail(error, response);
      if (g.json) return printJson(data);

      const rows = (data.tags ?? []).map((t) => [t.slug, t.name, String(t.count)]);
      console.log(table(["SLUG", "NAME", "POSTS"], rows));
    });

  return posts;
}
