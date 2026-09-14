import { getHostId } from "@superset/shared/host-info";
import { resolveHostTarget } from "../../../../../lib/host-target";

export async function resolvePageWatchClient({
	organizationId,
	userJwt,
	api,
}: {
	organizationId: string;
	userJwt: string;
	api: Parameters<typeof resolveHostTarget>[0]["api"];
}): Promise<
	Awaited<ReturnType<typeof resolveHostTarget>>["client"]["pageWatch"]
> {
	const target = await resolveHostTarget({
		requestedHostId: getHostId(),
		organizationId,
		userJwt,
		api,
	});
	return target.client.pageWatch;
}
