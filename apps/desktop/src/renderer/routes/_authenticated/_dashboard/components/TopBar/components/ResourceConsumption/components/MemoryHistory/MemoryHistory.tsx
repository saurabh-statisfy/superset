import { Trans } from "@lingui/react/macro";
import { useMemo } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { formatMemory } from "../../utils/formatters";

const WIDTH = 280;
const HEIGHT = 36;
/** Two samples is the minimum that draws a line rather than a dot. */
const MIN_POINTS = 2;

function formatClock(t: number): string {
	return new Date(t).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Last hour of resident memory, sampled every 30s by the main process (see
 * main/lib/resource-metrics/history.ts). The sampler starts at app launch, so
 * a fresh launch shows a short line that fills out to the full hour.
 */
export function MemoryHistory() {
	const { data: history } = electronTrpc.resourceMetrics.getHistory.useQuery(
		undefined,
		{ refetchInterval: 30_000 },
	);

	const chart = useMemo(() => {
		if (!history || history.length < MIN_POINTS) return null;

		const values = history.map((sample) => sample.memory);
		const lo = Math.min(...values);
		const hi = Math.max(...values);
		// Pad a flat series so it draws mid-box instead of on the floor.
		const span = Math.max(hi - lo, Math.max(1, hi * 0.04));
		const yMin = lo - span * 0.2;
		const yMax = hi + span * 0.2;

		const t0 = history[0].t;
		const tSpan = Math.max(1, history[history.length - 1].t - t0);
		const points = history.map((sample) => {
			const x = ((sample.t - t0) / tSpan) * WIDTH;
			const y = HEIGHT - ((sample.memory - yMin) / (yMax - yMin)) * HEIGHT;
			return [x, y] as const;
		});

		const line = points
			.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
			.join(" ");
		const last = points[points.length - 1];

		return {
			line,
			area: `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`,
			last,
			lo,
			hi,
			from: history[0].t,
		};
	}, [history]);

	if (!chart) {
		return (
			<div className="mt-3 text-[11px] text-muted-foreground">
				<Trans>Collecting memory history…</Trans>
			</div>
		);
	}

	return (
		<div className="mt-3 flex flex-col gap-1">
			<div className="flex items-baseline justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
				<span>
					<Trans>Memory, last hour</Trans>
				</span>
				<span className="tabular-nums normal-case tracking-normal">
					{formatMemory(chart.lo)} – {formatMemory(chart.hi)}
				</span>
			</div>
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				preserveAspectRatio="none"
				className="h-9 w-full"
				role="img"
				aria-label={`Memory over the last hour, ${formatMemory(chart.lo)} to ${formatMemory(chart.hi)}`}
			>
				<path d={chart.area} className="fill-foreground/10" />
				<path
					d={chart.line}
					fill="none"
					className="stroke-foreground/60"
					strokeWidth={1.5}
					strokeLinejoin="round"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
				<circle
					cx={chart.last[0]}
					cy={chart.last[1]}
					r={2.5}
					className="fill-foreground"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
			<div className="text-[10px] tabular-nums text-muted-foreground">
				<Trans>since {formatClock(chart.from)}</Trans>
			</div>
		</div>
	);
}
