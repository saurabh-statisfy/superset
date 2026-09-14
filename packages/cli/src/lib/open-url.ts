import { spawn } from "node:child_process";

const DEFAULT_LAUNCH_TIMEOUT_MS = 5_000;

export function openUrl(
	url: string,
	timeoutMs = DEFAULT_LAUNCH_TIMEOUT_MS,
): Promise<void> {
	const [bin, args]: [string, string[]] =
		process.platform === "darwin"
			? ["open", [url]]
			: process.platform === "win32"
				? ["cmd", ["/c", "start", "", url]]
				: ["xdg-open", [url]];

	return new Promise((resolve, reject) => {
		const child = spawn(bin, args, { stdio: "ignore", detached: true });

		const timer = setTimeout(() => {
			child.unref();
			reject(new Error(`${bin} did not exit within ${timeoutMs}ms`));
		}, timeoutMs);
		timer.unref();

		child.once("error", (error) => {
			clearTimeout(timer);
			reject(error);
		});
		child.once("close", (code) => {
			clearTimeout(timer);
			child.unref();
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`${bin} exited with code ${code}`));
			}
		});
	});
}
