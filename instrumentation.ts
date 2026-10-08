export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { warmDictionaryIndex } = await import("./lib/dictionary-index");
    warmDictionaryIndex();
  }
}
