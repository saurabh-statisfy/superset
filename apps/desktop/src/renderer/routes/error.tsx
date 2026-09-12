import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { i18n } from "@superset/i18n";
import { Button } from "@superset/ui/button";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	HiCheck,
	HiExclamationTriangle,
	HiOutlineClipboard,
} from "react-icons/hi2";
import { useCopyToClipboard } from "renderer/hooks/useCopyToClipboard";

const IS_DEV = process.env.NODE_ENV === "development";
const ERROR_DETAILS_ID = "error-details";

export function ErrorPage({ error, info }: ErrorComponentProps) {
	// This is the ROOT route's errorComponent, so it renders *instead of*
	// RootComponent — outside RootLayout, and therefore outside
	// LanguageAwareI18nProvider. `useLingui`/`<Trans>` throw without that
	// context, which replaced every real route error with "useLingui hook was
	// used without I18nProvider" and made the actual failure invisible. The
	// global i18n instance needs no context and falls back to the English
	// source text when no catalog is active yet.
	const t = (descriptor: MessageDescriptor) => i18n._(descriptor);
	const message =
		error instanceof Error ? error.message : String(error ?? "Unknown error");
	const stack = error instanceof Error ? error.stack : undefined;
	const details = stack ?? message;
	const componentStack = info?.componentStack;

	const [showDetails, setShowDetails] = useState(IS_DEV);
	const { copyToClipboard, copied } = useCopyToClipboard();

	useEffect(() => {
		console.error("[renderer] Route error caught:", error, componentStack);
		void import("@sentry/electron/renderer")
			.then((Sentry) =>
				Sentry.captureException(error, {
					extra: componentStack ? { componentStack } : undefined,
				}),
			)
			.catch(() => {});
	}, [error, componentStack]);

	return (
		<div className="flex flex-col h-full w-full bg-background">
			<div className="h-12 w-full drag shrink-0" />

			<div className="flex flex-1 items-start justify-center overflow-y-auto pt-[18vh] pb-12">
				<div className="flex flex-col items-center w-full max-w-2xl px-8 gap-6">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
						<HiExclamationTriangle className="h-8 w-8 text-destructive" />
					</div>

					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="text-xl font-semibold">
							{t(msg({ message: "Something went wrong" }))}
						</h1>
						<p className="text-sm text-muted-foreground">
							{t(
								msg({
									message:
										"Superset hit an unexpected error. Reload to try again.",
								}),
							)}
						</p>
					</div>

					<div className="flex items-center gap-3">
						<Button onClick={() => window.location.reload()}>
							{t(msg({ message: "Reload" }))}
						</Button>
						<Button variant="outline" asChild>
							<Link to="/">{t(msg({ message: "Go home" }))}</Link>
						</Button>
					</div>

					<button
						type="button"
						onClick={() => setShowDetails((value) => !value)}
						aria-expanded={showDetails}
						aria-controls={ERROR_DETAILS_ID}
						className="text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						{showDetails
							? t(msg({ message: "Hide details" }))
							: t(msg({ message: "Show details" }))}
					</button>

					{showDetails && (
						<div id={ERROR_DETAILS_ID} className="relative w-full">
							<button
								type="button"
								onClick={() => {
									void copyToClipboard(details).catch(() => {});
								}}
								className="absolute top-2 right-2 flex items-center justify-center h-6 w-6 bg-background/80 backdrop-blur border border-border rounded hover:bg-accent transition-colors"
								aria-label={t(msg({ message: "Copy error details" }))}
							>
								{copied ? (
									<HiCheck className="w-3.5 h-3.5 text-green-500" />
								) : (
									<HiOutlineClipboard className="w-3.5 h-3.5" />
								)}
							</button>
							<pre className="w-full max-h-80 overflow-auto rounded-md border border-border bg-muted/40 p-3 pr-10 text-left text-xs text-muted-foreground select-text">
								{details}
							</pre>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
