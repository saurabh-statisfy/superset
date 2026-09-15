import { z } from "zod";
import { protectedProcedure } from "../../../index";
import { actionRejectionError } from "../../github/github";
import { resolveGithubRepo } from "../../workspace-creation/shared/project-helpers";

const createReviewCommentInputSchema = z.object({
	projectId: z.string(),
	prNumber: z.number().int().positive(),
	path: z.string().min(1),
	startLine: z.number().int().positive(),
	endLine: z.number().int().positive(),
	/** Which half of the split diff the selection came from. "mixed" means the
	 *  range straddles both, which GitHub cannot express. */
	side: z.enum(["additions", "deletions", "mixed"]),
	body: z.string().trim().min(1),
});

// Starts a *new* review thread on a line, the counterpart to replyToThread
// (which only appends to a thread that already exists). Scoped by project +
// PR number like the rest of this router, because the Code tab browses a PR
// with no workspace necessarily linked to it.
export const createReviewComment = protectedProcedure
	.input(createReviewCommentInputSchema)
	.mutation(async ({ ctx, input }) => {
		const repo = await resolveGithubRepo(ctx, input.projectId);
		const octokit = await ctx.github();

		// GitHub anchors a review comment to a commit, and only the head
		// commit is guaranteed to still contain the line the user clicked.
		const { data: pr } = await octokit.pulls.get({
			owner: repo.owner,
			repo: repo.name,
			pull_number: input.prNumber,
		});

		// ponytail: a mixed-side range collapses to a single comment on the
		// end line of the new file. GitHub has no way to span both sides of a
		// split diff, so anything smarter here would be inventing semantics.
		const side = input.side === "deletions" ? "LEFT" : "RIGHT";
		const isMultiLine =
			input.side !== "mixed" && input.startLine < input.endLine;

		try {
			const { data } = await octokit.pulls.createReviewComment({
				owner: repo.owner,
				repo: repo.name,
				pull_number: input.prNumber,
				commit_id: pr.head.sha,
				path: input.path,
				body: input.body,
				side,
				line: input.endLine,
				...(isMultiLine
					? { start_line: input.startLine, start_side: side }
					: {}),
			});
			return { id: data.id, url: data.html_url };
		} catch (error) {
			throw actionRejectionError(error, "GitHub refused the comment.");
		}
	});
