import { createClient } from "@supabase/supabase-js";

const volumes = [
  ["ISBE Volume I", "bibleencyclopaed01unknuoft"],
  ["ISBE Volume II", "bibleencyclopedi02orruoft"],
  ["ISBE Volume III", "bibleencyclopedi03orruoft"],
  ["ISBE Volume IV", "bibleencyclopedi04orruoft"],
  ["ISBE Volume V", "bibleencyclopedi05orruoft"],
] as const;

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  if (process.env.NODE_ENV === "production") throw new Error("Ingestion scripts must run locally.");
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  for (const [term, identifier] of volumes) {
    const url = `https://archive.org/download/${identifier}/${identifier}_djvu.txt`;
    const response = await fetchWithRetry(url);
    if (!response.ok) throw new Error(`Unable to fetch ${term}: ${response.status}`);
    const body = await response.text();
    const { error } = await supabase.from("dictionary_entries").upsert({ term, source: "ISBE", body_text: `Public-domain 1915 edition. Source: ${url}\n\n${body}` }, { onConflict: "term,source" });
    if (error) throw error;
    console.log(`Ingested ${term}`);
  }
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
  throw lastError instanceof Error ? lastError : new Error("Fetch failed");
}

void main();
