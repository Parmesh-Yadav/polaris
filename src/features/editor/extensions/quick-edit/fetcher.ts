import ky from "ky";
import z from "zod";
import { toast } from "sonner";

const editRequestSchema = z.object({
  selectedCode: z.string(),
  fullCode: z.string(),
  instruction: z.string(),
});

const editResponseSchema = z.object({
  editedCode: z.string(),
});

type EditRequest = z.infer<typeof editRequestSchema>;
type EditResponse = z.infer<typeof editResponseSchema>;

export const fetcher = async (
  payload: EditRequest,
  signal: AbortSignal,
): Promise<string | null> => {
  try {
    const validatedPayload = editRequestSchema.parse(payload);

    const response = await ky
      .post("/api/quick-edit", {
        json: validatedPayload,
        signal,
        timeout: 30_000, // 30 seconds, editing might take longer than generating a suggestion
        retry: 0, // no retries, we want to fail fast if the request fails
      })
      .json<EditResponse>();

    const validatedResponse = editResponseSchema.parse(response);
    return validatedResponse.editedCode || null;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return null;
    }
    toast.error("Failed to fetch AI quick edit.");
    return null;
  }
};
