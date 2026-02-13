import z, { int } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  projectId: z.string(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectId } = requestSchema.parse(body);

  const internalKey = process.env.CONVEX_INTERNAL_KEY!;
  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 },
    );
  }

  // find all processing messages in this project.
  const processingMessage = await convex.query(
    api.system.getProcessingMessages,
    {
      internalKey,
      projectId: projectId as Id<"projects">,
    },
  );

  if (processingMessage.length === 0) {
    return NextResponse.json(
      { message: "No processing messages found" },
      { status: 200 },
    );
  }

  // cancel all processing messages.
  const cancelledIds = await Promise.all(
    processingMessage.map(async (msg) => {
      await inngest.send({
        name: "message/cancel",
        data: {
          messageId: msg._id,
        },
      });

      await convex.mutation(api.system.updateMessageStatus, {
        internalKey,
        messageId: msg._id,
        status: "cancelled",
      });

      return msg._id;
    }),
  );

  return NextResponse.json(
    {
      success: true,
      message: `Cancelled ${cancelledIds.length} messages`,
      cancelledIds,
    },
    { status: 200 },
  );
}
