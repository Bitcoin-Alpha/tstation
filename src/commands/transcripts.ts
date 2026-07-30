import { Command } from "commander";
import { apiFail, fail, makeClient, printJson, table, type GlobalOpts } from "../client.js";
import type { paths } from "../generated/content.js";

type ListQuery = NonNullable<paths["/content/transcripts"]["get"]["parameters"]["query"]>;

const stripMarks = (s: string) => s.replace(/<\/?mark>/g, "");

export function transcriptsCommand(globals: () => GlobalOpts): Command {
  const transcripts = new Command("transcripts").description("Browse podcast transcripts");

  transcripts
    .command("list")
    .description("List or search transcripts")
    .option("--search <query>", "full-text search query; results are ranked and include a snippet")
    .option("--show <slug>", "filter by show slug")
    .option("--page <n>", "1-based page")
    .option("--limit <n>", "items per page (1-50)")
    .action(async (o: Record<string, string>) => {
      const g = globals();
      const query: ListQuery = {};
      if (o.search) query.search = o.search;
      if (o.show) query.show = o.show;
      if (o.page !== undefined) {
        const page = Number(o.page);
        if (!Number.isInteger(page) || page < 1) fail("--page must be a positive integer");
        query.page = page;
      }
      if (o.limit !== undefined) {
        const limit = Number(o.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 50) fail("--limit must be an integer between 1 and 50");
        query.limit = limit;
      }

      const { data, error, response } = await makeClient(g).GET("/content/transcripts", { params: { query } });
      if (!data) apiFail(error, response);
      if (g.json) return printJson(data);

      const items = data.items ?? [];
      if (query.search) {
        for (const t of items) {
          console.log(`${t.show}/${t.episode}  ${t.title ?? ""}`.trimEnd());
          if (t.snippet) console.log(`  ${stripMarks(t.snippet)}`);
        }
      } else {
        const rows = items.map((t) => [
          t.show,
          String(t.episode),
          t.word_count !== undefined ? String(t.word_count) : "",
          t.title ?? "",
        ]);
        console.log(table(["SHOW", "EP", "WORDS", "TITLE"], rows));
      }
      if (data.has_more) {
        console.log(`\nMore available: tstation transcripts list --page ${data.page + 1}`);
      }
    });

  transcripts
    .command("get")
    .description("Get a transcript by show slug and episode number")
    .argument("<show>", "show slug")
    .argument("<episode>", "episode number")
    .action(async (show: string, episodeArg: string) => {
      const g = globals();
      const episode = Number(episodeArg);
      if (!Number.isInteger(episode) || episode < 0) fail("<episode> must be a non-negative integer");

      const { data, error, response } = await makeClient(g).GET("/content/transcripts/{show}/{episode}", {
        params: { path: { show, episode } },
      });
      if (!data) apiFail(error, response);
      if (g.json) return printJson(data);

      const heading = data.title || `${data.show} #${data.episode}`;
      console.log(heading);
      console.log("=".repeat(heading.length));
      console.log(`Show:      ${data.show}`);
      console.log(`Episode:   ${data.episode}`);
      if (data.word_count !== undefined) console.log(`Words:     ${data.word_count}`);
      if (data.processed_at) console.log(`Processed: ${data.processed_at.slice(0, 10)}`);
      console.log(`Updated:   ${data.updated_at.slice(0, 10)}`);
      console.log();
      console.log(data.transcript);
    });

  return transcripts;
}
