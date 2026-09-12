import { useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import { cn } from "@superset/ui/lib/utils";
import { toast } from "@superset/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { useState } from "react";
import { LuGitMerge } from "react-icons/lu";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

type SyncStatus =
	| "merged"
	| "already-current"
	| "conflict"
	| "dirty"
	| "skipped-base"
	| "error";

interface SyncResult {
	workspaceId: string;
	branch: string;
	status: SyncStatus;
	detail: string | null;
}

/**
 * Merges the default branch into every worktree on this host. Nothing is
 * closed or deleted, and a worktree whose merge conflicts is rolled back and
 * reported rather than left half-merged.
 */
export function SyncMainButton() {
	const { t } = useLingui();
	const { waitForHostReady } = useLocalHostService();
	const [isSyncing, setIsSyncing] = useState(false);

	const summarize = (results: SyncResult[]) => {
		const count = (status: SyncStatus) =>
			results.filter((r) => r.status === status).length;
		const merged = count("merged");
		const needsAttention = results.filter(
			(r) => r.status === "conflict" || r.status === "dirty",
		);

		if (results.length === 0) {
			toast.info(t({ message: "No worktrees to sync" }));
			return;
		}
		if (needsAttention.length === 0) {
			toast.success(
				merged > 0
					? t({ message: `Merged into ${merged} worktree(s)` })
					: t({ message: "Every worktree was already up to date" }),
			);
			return;
		}
		// Name the ones a person has to go and fix; a bare count sends them
		// hunting through the sidebar for which.
		const names = needsAttention.map((r) => r.branch).join(", ");
		toast.warning(
			t({
				message: `Merged into ${merged} worktree(s). Needs attention: ${names}`,
			}),
			{
				description:
					count("conflict") > 0
						? t({
								message:
									"Conflicting merges were rolled back — those worktrees are unchanged.",
							})
						: t({ message: "Skipped worktrees with uncommitted changes." }),
			},
		);
	};

	const handleClick = async () => {
		if (isSyncing) return;
		setIsSyncing(true);
		try {
			const hostUrl = await waitForHostReady();
			if (!hostUrl) {
				toast.error(t({ message: "Local host service is not running" }));
				return;
			}
			const client = getHostServiceClientByUrl(hostUrl);
			const { results } = await client.git.syncAllFromDefaultBranch.mutate();
			summarize(results as SyncResult[]);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : t({ message: "Sync failed" }),
			);
		} finally {
			setIsSyncing(false);
		}
	};

	return (
		<Tooltip delayDuration={150}>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon-xs"
					disabled={isSyncing}
					onClick={() => void handleClick()}
					aria-label={t({ message: "Sync main into all worktrees" })}
					className="no-drag relative text-muted-foreground hover:text-foreground"
				>
					<LuGitMerge
						className={cn("size-3.5", isSyncing && "animate-pulse")}
						strokeWidth={1.5}
					/>
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				{isSyncing
					? t({ message: "Syncing…" })
					: t({ message: "Sync main into all worktrees" })}
			</TooltipContent>
		</Tooltip>
	);
}
