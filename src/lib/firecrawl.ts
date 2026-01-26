import FireCrawl from "@mendable/firecrawl-js";

export const firecrawl = new FireCrawl({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});
