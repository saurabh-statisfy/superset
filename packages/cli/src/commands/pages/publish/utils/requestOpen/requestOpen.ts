import type { resolveHostTarget } from "../../../../../lib/host-target";
import { resolvePageWatchClient } from "../resolvePageWatchClient";

export async function requestPageOpen({
	pageId,
	slug,
	title,
	workspaceId,
	organizationId,
	userJwt,
	api,
}: {
	pageId: string;
	slug: string;
	title: string;
	workspaceId: string;
	organizationId: string;
	userJwt: string;
	api: Parameters<typeof resolveHostTarget>[0]["api"];
}): Promise<void> {
	const pageWatch = await resolvePageWatchClient({
		organizationId,
		userJwt,
		api,
	});
	await pageWatch.requestOpen.mutate({ pageId, slug, title, workspaceId });
}
