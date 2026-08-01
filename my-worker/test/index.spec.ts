import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("KV worker", () => {
	it("responds with KV values (unit style)", async () => {
		const request = new IncomingRequest("http://example.com");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		const data = await response.json();
		expect(data).toMatchObject({ value: "VALUE" });
	});

	it("responds with KV values (integration style)", async () => {
		const response = await SELF.fetch("https://example.com");
		const data = await response.json();
		expect(data).toMatchObject({ value: "VALUE" });
	});
});
