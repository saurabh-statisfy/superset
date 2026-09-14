import type { WorkspaceStore } from "@superset/panes";
import { useRef } from "react";
import { useWorkspaceEvent } from "renderer/hooks/host-service/useWorkspaceEvent";
import { useV2UserPreferences } from "renderer/hooks/useV2UserPreferences";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import type { StoreApi } from "zustand/vanilla";
import type { PaneViewerData } from "../../types";
import { openPagePaneInStore } from "../../utils/openPagePaneInStore";

export function useConsumePageOpenRequest({
	workspaceId,
	store,
}: {
	workspaceId: string;
	store: StoreApi<WorkspaceStore<PaneViewerData>>;
}): void {
	const { preferences } = useV2UserPreferences();
	const consumedRequestIds = useRef<Set<string>>(new Set());

	useWorkspaceEvent("page:open-requested", workspaceId, (payload) => {
		if (consumedRequestIds.current.has(payload.requestId)) return;
		consumedRequestIds.current.add(payload.requestId);

		if (preferences.pageOpenAction === "external") {
			electronTrpcClient.external.openUrl.mutate(payload.url).catch((error) => {
				console.error("[page-open-request] Failed to open URL:", error);
			});
			return;
		}

		openPagePaneInStore(
			store,
			{ pageId: payload.pageId, slug: payload.slug, title: payload.title },
			preferences.pageOpenAction === "newTab" ? "tab" : "split",
		);
	});
}
