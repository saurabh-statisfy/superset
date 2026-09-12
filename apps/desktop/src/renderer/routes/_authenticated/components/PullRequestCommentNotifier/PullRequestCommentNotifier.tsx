import { usePullRequestCommentNotifications } from "renderer/routes/_authenticated/hooks/usePullRequestCommentNotifications";

/**
 * Mount point for PR comment notifications.
 *
 * The hook reads LocalHostServiceProvider's context, so it cannot run in
 * AuthenticatedLayout itself — that component *renders* the provider, and a
 * hook there sits above it. This component is rendered inside the provider
 * tree instead.
 */
export function PullRequestCommentNotifier(): null {
	usePullRequestCommentNotifications();
	return null;
}
