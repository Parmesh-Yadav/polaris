import ky from "ky";
import z from "zod";
import { toast } from "sonner";

const suggestionRequestSchema = z.object({
  fileName: z.string(),
  code: z.string(),
  previousLines: z.string(),
  currentLine: z.string(),
  textBeforeCursor: z.string(),
  textAfterCursor: z.string(),
  nextLines: z.string(),
  lineNumber: z.number(),
});

const suggestionResponseSchema = z.object({
  suggestion: z.string(),
});

type SuggestionRequest = z.infer<typeof suggestionRequestSchema>;
type SuggestionResponse = z.infer<typeof suggestionResponseSchema>;

export const fetcher = async (
  payload: SuggestionRequest,
  signal: AbortSignal,
): Promise<string | null> => {
  try {
    const validatedPayload = suggestionRequestSchema.parse(payload);

    const response = await ky
      .post("/api/suggestion", {
        json: validatedPayload,
        signal,
        timeout: false, // we handle timeout via debounce, so we don't want ky to throw on timeout
        retry: 0, // no retries, we want to fail fast if the request fails
      })
      .json<SuggestionResponse>();

    const validatedResponse = suggestionResponseSchema.parse(response);
    return validatedResponse.suggestion || null;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return null;
    }
    toast.error("Failed to fetch AI completion.");
    return null;
  }
};
