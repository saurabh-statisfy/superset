import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { PageWatchStatus } from "../../../page-watch/index.ts";
import { protectedProcedure, router } from "../../index";

const assignInputSchema = z.object({
	pageId: z.string().uuid(),
	slug: z.string().min(1),
	title: z.string().min(1),
	workspaceId: z.string().min(1),
	terminalId: z.string().min(1),
	agentId: z.string().min(1).nullable().default(null),
});

const pageInputSchema = z.object({ pageId: z.string().uuid() });

const listInputSchema = z
	.object({ workspaceId: z.string().min(1).optional() })
	.optional();

const requestOpenInputSchema = z.object({
	pageId: z.string().uuid(),
	slug: z.string().min(1),
	title: z.string().min(1),
	workspaceId: z.string().min(1),
	url: z.string().min(1),
});

export const pageWatchRouter = router({
	assign: protectedProcedure
		.input(assignInputSchema)
		.mutation(async ({ ctx, input }): Promise<PageWatchStatus[]> => {
			try {
				await ctx.runtime.pageWatch.assign(input);
			} catch (error) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: error instanceof Error ? error.message : "Cannot watch page",
				});
			}
			return ctx.runtime.pageWatch.list(input.workspaceId);
		}),

	// Independent of watch state (no agent required) — a one-shot broadcast
	// asking whatever renderer has this workspace open to open the page,
	// per its own pageOpenAction preference. Fire-and-forget: nothing is
	// listening when no window has this workspace open, and that's fine.
	requestOpen: protectedProcedure
		.input(requestOpenInputSchema)
		.mutation(({ ctx, input }) => {
			const requestId = crypto.randomUUID();
			ctx.eventBus.broadcastPageOpenRequested({
				...input,
				requestId,
				occurredAt: Date.now(),
			});
			return { requestId };
		}),

	unwatch: protectedProcedure
		.input(pageInputSchema)
		.mutation(async ({ ctx, input }): Promise<{ pageId: string }> => {
			await ctx.runtime.pageWatch.unwatch(input.pageId);
			return { pageId: input.pageId };
		}),

	getAll: protectedProcedure
		.input(listInputSchema)
		.query(({ ctx, input }): PageWatchStatus[] =>
			ctx.runtime.pageWatch.list(input?.workspaceId),
		),
});
