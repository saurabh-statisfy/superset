import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

/**
 * Native notifications for new comments on the pull requests this host tracks.
 *
 * Polls the host service, which talks to GitHub directly with local git
 * credentials — the cloud automation path (GitHub webhook → API → relay) can
 * never fire on a machine GitHub cannot reach, which is every offline install.
 */

const POLL_INTERVAL_MS = 2 * 60 * 1000;
/** First run has no watermark; a short look-back beats replaying all history. */
const INITIAL_LOOKBACK_MS = 15 * 60 * 1000;
/**
 * A single ISO timestamp, not a set of seen ids: ids are entity-keyed with
 * unbounded cardinality, which the persisted-state policy keeps out of
 * localStorage. A fixed-size singleton is explicitly allowed.
 */
// ponytail: GitHub's repo-scoped `since` returns a single 100-item page, so a
// watermark older than this would silently drop whatever falls past it. Cap the
// look-back rather than paginate — after a long absence you get the recent
// comments, not a backfill. Paginate if anyone actually wants the backfill.
const MAX_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const WATERMARK_KEY = "pr-comment-notify-watermark-v1";
/** One burst of comments should not become one notification per comment. */
const MAX_NOTIFICATIONS_PER_POLL = 3;

function readWatermark(): string {
	try {
		const stored = localStorage.getItem(WATERMARK_KEY);
		if (stored) return stored;
	} catch {
		// Private windows and cleared site data both throw here.
	}
	return new Date(Date.now() - INITIAL_LOOKBACK_MS).toISOString();
}

/** Never ask GitHub for more history than one page can answer. */
function clampSince(watermark: string): string {
	const floor = new Date(Date.now() - MAX_LOOKBACK_MS).toISOString();
	return watermark < floor ? floor : watermark;
}

function writeWatermark(value: string): void {
	try {
		localStorage.setItem(WATERMARK_KEY, value);
	} catch {}
}

export function usePullRequestCommentNotifications(): void {
	const { t } = useLingui();
	const { activeHostUrl } = useLocalHostService();
	const showNative = electronTrpc.notifications.showNative.useMutation();
	// The watermark advances from the comments actually seen, so a comment
	// written between the request and the response is not skipped by a clock.
	const watermarkRef = useRef<string | null>(null);
	if (watermarkRef.current === null) watermarkRef.current = readWatermark();

	const { data } = useQuery({
		queryKey: ["pr-comment-notifications", activeHostUrl],
		enabled: !!activeHostUrl,
		refetchInterval: POLL_INTERVAL_MS,
		queryFn: async () => {
			if (!activeHostUrl) return null;
			return getHostServiceClientByUrl(
				activeHostUrl,
			).github.listRecentComments.query({
				since: clampSince(watermarkRef.current ?? readWatermark()),
			});
		},
	});

	useEffect(() => {
		const comments = data?.comments;
		if (!comments?.length) return;

		const watermark = watermarkRef.current ?? readWatermark();
		const fresh = comments.filter((c) => c.createdAt > watermark);
		if (fresh.length === 0) return;

		// Advance first: a failed notification must not replay on every poll.
		const newest = fresh.reduce(
			(max, c) => (c.createdAt > max ? c.createdAt : max),
			watermark,
		);
		watermarkRef.current = newest;
		writeWatermark(newest);

		for (const comment of fresh.slice(0, MAX_NOTIFICATIONS_PER_POLL)) {
			showNative.mutate({
				title: t({
					message: `${comment.author} commented on ${comment.repo}#${comment.prNumber}`,
				}),
				body: comment.body,
				silent: false,
			});
		}

		const overflow = fresh.length - MAX_NOTIFICATIONS_PER_POLL;
		if (overflow > 0) {
			showNative.mutate({
				title: t({ message: `${overflow} more new comment(s)` }),
				body: t({ message: "Open Pull requests to read them." }),
				silent: true,
			});
		}
	}, [data, showNative, t]);
}
