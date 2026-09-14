import { describe, expect, mock, test } from "bun:test";
import * as realChildProcess from "node:child_process";
import { EventEmitter } from "node:events";

class FakeChild extends EventEmitter {
	unref = mock(() => undefined);
}

let nextChild = new FakeChild();
const spawnMock = mock(() => nextChild);

mock.module("node:child_process", () => ({
	...realChildProcess,
	spawn: spawnMock,
}));

const { openUrl } = await import("./open-url");

describe("openUrl", () => {
	test("resolves once the launcher exits 0", async () => {
		nextChild = new FakeChild();
		const promise = openUrl("https://example.com");
		nextChild.emit("close", 0);
		await expect(promise).resolves.toBeUndefined();
	});

	test("rejects when the launcher exits non-zero", async () => {
		nextChild = new FakeChild();
		const promise = openUrl("https://example.com");
		nextChild.emit("close", 1);
		await expect(promise).rejects.toThrow(/exited with code 1/);
	});

	test("rejects when the launcher binary itself can't run", async () => {
		nextChild = new FakeChild();
		const promise = openUrl("https://example.com");
		nextChild.emit("error", new Error("ENOENT"));
		await expect(promise).rejects.toThrow("ENOENT");
	});

	test("rejects instead of hanging forever when the launcher never closes", async () => {
		nextChild = new FakeChild();
		const promise = openUrl("https://example.com", 10);
		await expect(promise).rejects.toThrow(/did not exit within 10ms/);
	});
});
