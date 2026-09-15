import { get as idbGet, set as idbSet } from "idb-keyval";

/** Host identity fields the target-derivation read paths need. */
export interface KnownHostRow {
	organizationId: string;
	machineId: string;
	isOnline: boolean;
}

const SNAPSHOT_KEY_PREFIX = "known-hosts:v1";

function snapshotKey(organizationId: string): string {
	return `${SNAPSHOT_KEY_PREFIX}:${organizationId}`;
}

/**
 * Pick the host list to derive query targets from. Live rows win outright when
 * present. An empty live list is authoritative only once the query has
 * answered — so deleting an org's last host clears the sidebar instead of a
 * stale snapshot resurrecting it — while an empty result from a query that
 * hasn't answered yet (cold start, offline boot) falls back to the last-seen
 * snapshot.
 */
export function resolveKnownHosts(
	liveRows: KnownHostRow[],
	snapshotRows: KnownHostRow[] | undefined,
	liveReady: boolean,
): KnownHostRow[] {
	if (liveRows.length > 0) return liveRows;
	if (liveReady) return [];
	return snapshotRows ?? [];
}

export async function loadKnownHostsSnapshot(
	organizationId: string,
): Promise<KnownHostRow[] | undefined> {
	if (!organizationId) return undefined;
	try {
		const rows = await idbGet<KnownHostRow[]>(snapshotKey(organizationId));
		// Guard against a snapshot written under a different key scheme or a
		// corrupted value — bad persistence must degrade to "no snapshot".
		if (!Array.isArray(rows)) return undefined;
		return rows.filter(
			(row) =>
				row &&
				typeof row.machineId === "string" &&
				row.organizationId === organizationId,
		);
	} catch (error) {
		console.warn("[known-hosts] snapshot read failed", {
			organizationId,
			error,
		});
		return undefined;
	}
}

export function saveKnownHostsSnapshot(
	organizationId: string,
	rows: KnownHostRow[],
): void {
	if (!organizationId) return;
	void idbSet(snapshotKey(organizationId), rows).catch((error) => {
		console.warn("[known-hosts] snapshot write failed", {
			organizationId,
			error,
		});
	});
}

/**
 * Whether the host list is as trustworthy as it will get.
 *
 * Offline builds (SUPERSET_OFFLINE) talk to no cloud, so `v2Host.list` can
 * only ever fail and nothing is ever persisted to fall back on. Without the
 * last clause every `isReady` gate downstream (projects, workspaces, tag
 * folders) stays false for the life of the process — a "Loading
 * repositories…" that never resolves.
 */
export function isKnownHostsSettled({
	liveReady,
	hasSnapshot,
	isOffline,
	isError,
}: {
	liveReady: boolean;
	hasSnapshot: boolean;
	isOffline: boolean;
	isError: boolean;
}): boolean {
	return liveReady || hasSnapshot || (isOffline && isError);
}
