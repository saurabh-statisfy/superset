import type { resolveHostTarget } from "../../../../../lib/host-target";
import { resolvePageWatchClient } from "../resolvePageWatchClient";

export function watchTerminalId(): string | undefined {
	return process.env.SUPERSET_TERMINAL_ID;
}

export async function registerWatch({
	pageId,
	slug,
	title,
	workspaceId,
	terminalId,
	organizationId,
	userJwt,
	api,
}: {
	pageId: string;
	slug: string;
	title: string;
	workspaceId: string;
	terminalId: string;
	organizationId: string;
	userJwt: string;
	api: Parameters<typeof resolveHostTarget>[0]["api"];
}): Promise<void> {
	const pageWatch = await resolvePageWatchClient({
		organizationId,
		userJwt,
		api,
	});
	await pageWatch.assign.mutate({
		pageId,
		slug,
		title,
		workspaceId,
		terminalId,
		agentId: process.env.SUPERSET_AGENT_ID ?? null,
	});
}
