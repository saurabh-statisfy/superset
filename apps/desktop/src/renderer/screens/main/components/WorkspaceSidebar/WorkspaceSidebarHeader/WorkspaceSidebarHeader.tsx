import { msg } from "@lingui/core/macro";
import { useLingui as useTranslation } from "@lingui/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@superset/ui/tooltip";
import { cn } from "@superset/ui/utils";
import {
	useMatchRoute,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { GoCodeReview, GoGitPullRequest } from "react-icons/go";
import { LuLayers } from "react-icons/lu";
import {
	pullRequestsSearchFromFilters,
	usePullRequestsFilterStore,
} from "renderer/routes/_authenticated/_dashboard/pull-requests/stores/pullRequestsFilterStore";
import { REVIEW_REQUESTED } from "renderer/routes/_authenticated/_dashboard/pull-requests/utils/pullRequestReviewFilter";
import { STROKE_WIDTH } from "../constants";
import { NewWorkspaceButton } from "./NewWorkspaceButton";

interface WorkspaceSidebarHeaderProps {
	isCollapsed?: boolean;
}

export function WorkspaceSidebarHeader({
	isCollapsed = false,
}: WorkspaceSidebarHeaderProps) {
	const { _: translate } = useTranslation();

	const navigate = useNavigate();
	const matchRoute = useMatchRoute();

	const isWorkspacesListOpen = !!matchRoute({ to: "/workspaces" });
	const isPullRequestsRoute = !!matchRoute({
		to: "/pull-requests",
		fuzzy: true,
	});
	// Both PR entries land on /pull-requests; only the review filter in the URL
	// tells them apart, so read it rather than lighting up both.
	const activeReviewFilter = useRouterState({
		select: (state) => (state.location.search as { review?: string }).review,
	});
	const isReviewRequestedOpen =
		isPullRequestsRoute && activeReviewFilter === REVIEW_REQUESTED;
	const isPullRequestsOpen = isPullRequestsRoute && !isReviewRequestedOpen;

	const handleWorkspacesClick = () => {
		if (isWorkspacesListOpen) {
			// Navigate back to workspace view
			navigate({ to: "/workspace" });
		} else {
			navigate({ to: "/workspaces" });
		}
	};

	const {
		search: lastPullRequestsSearch,
		projectFilters: lastPullRequestsProjectFilters,
		authorFilter: lastPullRequestsAuthorFilter,
		reviewFilter: lastPullRequestsReviewFilter,
		includeClosed: lastPullRequestsIncludeClosed,
		mergedOnly: lastPullRequestsMergedOnly,
	} = usePullRequestsFilterStore();

	const handleReviewRequestedClick = () => {
		navigate({
			to: "/pull-requests",
			search: pullRequestsSearchFromFilters({
				search: "",
				projectFilters: lastPullRequestsProjectFilters,
				authorFilter: null,
				reviewFilter: REVIEW_REQUESTED,
				includeClosed: false,
				mergedOnly: false,
			}),
		});
	};

	const handlePullRequestsClick = () => {
		navigate({
			to: "/pull-requests",
			search: pullRequestsSearchFromFilters({
				search: lastPullRequestsSearch,
				projectFilters: lastPullRequestsProjectFilters,
				authorFilter: lastPullRequestsAuthorFilter,
				reviewFilter: lastPullRequestsReviewFilter,
				includeClosed: lastPullRequestsIncludeClosed,
				mergedOnly: lastPullRequestsMergedOnly,
			}),
		});
	};

	if (isCollapsed) {
		return (
			<div className="flex flex-col items-center border-b border-border py-2 gap-2">
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={handleWorkspacesClick}
							className={cn(
								"flex items-center justify-center size-8 rounded-md transition-colors",
								isWorkspacesListOpen
									? "text-foreground bg-fill-selected"
									: "text-muted-foreground hover:text-foreground hover:bg-fill-hover",
							)}
						>
							<LuLayers className="size-4" strokeWidth={STROKE_WIDTH} />
						</button>
					</TooltipTrigger>
					<TooltipContent side="right">Workspaces</TooltipContent>
				</Tooltip>

				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={handlePullRequestsClick}
							aria-label={translate(msg({ message: "Pull requests" }))}
							aria-current={isPullRequestsOpen ? "page" : undefined}
							className={cn(
								"flex items-center justify-center size-8 rounded-md transition-colors",
								isPullRequestsOpen
									? "text-foreground bg-fill-selected"
									: "text-muted-foreground hover:text-foreground hover:bg-fill-hover",
							)}
						>
							<GoGitPullRequest className="size-4" strokeWidth={STROKE_WIDTH} />
						</button>
					</TooltipTrigger>
					<TooltipContent side="right">Pull requests</TooltipContent>
				</Tooltip>

				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={handleReviewRequestedClick}
							aria-label={translate(msg({ message: "Review requested" }))}
							aria-current={isReviewRequestedOpen ? "page" : undefined}
							className={cn(
								"flex items-center justify-center size-8 rounded-md transition-colors",
								isReviewRequestedOpen
									? "text-foreground bg-fill-selected"
									: "text-muted-foreground hover:text-foreground hover:bg-fill-hover",
							)}
						>
							<GoCodeReview className="size-4" strokeWidth={STROKE_WIDTH} />
						</button>
					</TooltipTrigger>
					<TooltipContent side="right">Review requested</TooltipContent>
				</Tooltip>

				<NewWorkspaceButton isCollapsed />
			</div>
		);
	}

	return (
		<div className="flex flex-col border-b border-border px-2 pt-2 pb-2">
			<button
				type="button"
				onClick={handleWorkspacesClick}
				className={cn(
					"flex items-center gap-2 px-2 py-1.5 w-full rounded-md transition-colors",
					isWorkspacesListOpen
						? "text-foreground bg-fill-selected"
						: "text-muted-foreground hover:text-foreground hover:bg-fill-hover",
				)}
			>
				<div className="flex items-center justify-center size-5">
					<LuLayers className="size-4" strokeWidth={STROKE_WIDTH} />
				</div>
				<span className="text-sm font-medium flex-1 text-left">Workspaces</span>
			</button>

			<button
				type="button"
				onClick={handlePullRequestsClick}
				aria-label={translate(msg({ message: "Pull requests" }))}
				aria-current={isPullRequestsOpen ? "page" : undefined}
				className={cn(
					"flex items-center gap-2 px-2 py-1.5 w-full rounded-md transition-colors",
					isPullRequestsOpen
						? "text-foreground bg-fill-selected"
						: "text-muted-foreground hover:text-foreground hover:bg-fill-hover",
				)}
			>
				<div className="flex items-center justify-center size-5">
					<GoGitPullRequest className="size-4" strokeWidth={STROKE_WIDTH} />
				</div>
				<span className="text-sm font-medium flex-1 text-left">
					Pull requests
				</span>
			</button>

			<button
				type="button"
				onClick={handleReviewRequestedClick}
				aria-label={translate(msg({ message: "Review requested" }))}
				aria-current={isReviewRequestedOpen ? "page" : undefined}
				className={cn(
					"flex items-center gap-2 px-2 py-1.5 w-full rounded-md transition-colors",
					isReviewRequestedOpen
						? "text-foreground bg-fill-selected"
						: "text-muted-foreground hover:text-foreground hover:bg-fill-hover",
				)}
			>
				<div className="flex items-center justify-center size-5">
					<GoCodeReview className="size-4" strokeWidth={STROKE_WIDTH} />
				</div>
				<span className="text-sm font-medium flex-1 text-left">
					Review requested
				</span>
			</button>

			<NewWorkspaceButton />
		</div>
	);
}
