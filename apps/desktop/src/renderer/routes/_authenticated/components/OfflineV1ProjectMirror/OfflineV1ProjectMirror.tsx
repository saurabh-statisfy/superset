import { useEffect, useRef } from "react";
import { env } from "renderer/env.renderer";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

/**
 * Offline builds never run the v1→v2 migration — it needs a signed-in org and
 * a PostHog flag, and has neither. So the host service, which every v2 surface
 * reads (the pull-request list included), keeps an empty `projects` table while
 * the sidebar shows repos from the v1 local DB: "No projects available." next
 * to a sidebar full of them.
 *
 * Mirror the v1 projects onto the host once per boot. `importLocal` is
 * idempotent per repo path, so a repeat pass reuses the existing row.
 */
export function OfflineV1ProjectMirror() {
	const { activeHostUrl } = useLocalHostService();
	const mirroredHostUrlRef = useRef<string | null>(null);

	useEffect(() => {
		if (!env.SKIP_ENV_VALIDATION || !activeHostUrl) return;
		if (mirroredHostUrlRef.current === activeHostUrl) return;
		mirroredHostUrlRef.current = activeHostUrl;

		const hostClient = getHostServiceClientByUrl(activeHostUrl);
		void (async () => {
			const v1Projects =
				await electronTrpcClient.migration.readV1Projects.query();
			const hostProjects = await hostClient.project.list.query();
			console.log("[offline-projects] mirror pass starting", {
				hostUrl: activeHostUrl,
				v1: v1Projects.map((project) => project.mainRepoPath),
				host: hostProjects.map((project) => project.repoPath),
			});

			for (const project of v1Projects) {
				try {
					const result = await hostClient.project.create.mutate({
						name: project.name,
						mode: { kind: "importLocal", repoPath: project.mainRepoPath },
					});
					console.log("[offline-projects] mirrored", {
						name: project.name,
						repoPath: project.mainRepoPath,
						hostProjectId: result.projectId,
						created: result.created,
					});
				} catch (err) {
					console.error("[offline-projects] mirror failed", {
						name: project.name,
						repoPath: project.mainRepoPath,
						err,
					});
				}
			}
		})().catch((err) => {
			console.error("[offline-projects] mirror pass failed", err);
		});
	}, [activeHostUrl]);

	return null;
}
