import { settings } from "@superset/local-db/schema";
import { localDb } from "main/lib/local-db";
import { DEFAULT_SHOW_RESOURCE_MONITOR } from "shared/constants";
import { collectResourceMetrics } from ".";

/**
 * Rolling memory/CPU history for the Resources panel.
 *
 * The snapshot cache in `./index.ts` only ever holds the latest reading, and
 * the panel polls solely while its popover is open — so "the last hour" had no
 * source until this sampler existed. Totals only: a full per-workspace tree
 * every 30s for an hour is orders of magnitude more memory than the panel
 * needs to draw a line.
 */

const SAMPLE_INTERVAL_MS = 30_000;
const WINDOW_MS = 60 * 60 * 1000;
/** One hour at SAMPLE_INTERVAL_MS, the window the panel draws. */
const MAX_SAMPLES = WINDOW_MS / SAMPLE_INTERVAL_MS;

export interface ResourceHistorySample {
	/** Unix ms. */
	t: number;
	/** Resident bytes across Superset + monitored terminal trees. */
	memory: number;
	/** Summed CPU percent (may exceed 100 across cores). */
	cpu: number;
	/** Host memory in use, bytes — context for the share the app holds. */
	hostUsedMemory: number;
	hostTotalMemory: number;
}

const samples: ResourceHistorySample[] = [];
let timer: NodeJS.Timeout | null = null;

function isResourceMonitorEnabled(): boolean {
	try {
		const row = localDb.select().from(settings).get();
		return row?.showResourceMonitor ?? DEFAULT_SHOW_RESOURCE_MONITOR;
	} catch {
		// A settings read that fails must not take the sampler down with it.
		return DEFAULT_SHOW_RESOURCE_MONITOR;
	}
}

export function getResourceHistory(): ResourceHistorySample[] {
	const cutoff = Date.now() - WINDOW_MS;
	return samples.filter((sample) => sample.t >= cutoff);
}

async function sample(): Promise<void> {
	// Collecting walks the process tree, so skip it entirely when the user has
	// the monitor switched off — a resource panel must not itself be the cost.
	if (!isResourceMonitorEnabled()) return;
	try {
		const snapshot = await collectResourceMetrics({ mode: "idle" });
		samples.push({
			t: Date.now(),
			memory: snapshot.totalMemory,
			cpu: snapshot.totalCpu,
			hostUsedMemory: snapshot.host.usedMemory,
			hostTotalMemory: snapshot.host.totalMemory,
		});
		if (samples.length > MAX_SAMPLES) {
			samples.splice(0, samples.length - MAX_SAMPLES);
		}
	} catch (error) {
		console.error("[resource-metrics] history sample failed:", error);
	}
}

export function startResourceHistorySampler(): void {
	if (timer) return;
	void sample();
	timer = setInterval(() => void sample(), SAMPLE_INTERVAL_MS);
	// Never hold the event loop open on this alone.
	timer.unref?.();
}

export function stopResourceHistorySampler(): void {
	if (!timer) return;
	clearInterval(timer);
	timer = null;
}
