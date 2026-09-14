import { getHostId } from "@superset/shared/host-info";
import { resolveHostTarget } from "../../../../../lib/host-target";

/**
 * Asks the desktop app attached to this host to open the page inside the
 * workspace that published it, instead of the system browser. Where it
 * actually lands — split, new tab, or the system browser after all — is
 * resolved on the renderer side from its own Pages link preference; this
 * call is fire-and-forget and does not know or wait for the outcome.
 */
export async function requestPageOpen({
	pageId,
	slug,
	title,
	workspaceId,
	url,
	organizationId,
	userJwt,
	api,
}: {
	pageId: string;
	slug: string;
	title: string;
	workspaceId: string;
	url: string;
	organizationId: string;
	userJwt: string;
	api: Parameters<typeof resolveHostTarget>[0]["api"];
}): Promise<void> {
	const target = await resolveHostTarget({
		requestedHostId: getHostId(),
		organizationId,
		userJwt,
		api,
	});
	await target.client.pageWatch.requestOpen.mutate({
		pageId,
		slug,
		title,
		workspaceId,
		url,
	});
}
