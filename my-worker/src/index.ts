interface Env {
	COMIC_METADATA: KVNamespace;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// write a key-value pair
		await env.COMIC_METADATA.put('KEY', 'VALUE');

		// read a key-value pair
		const value = await env.COMIC_METADATA.get('KEY');

		// list all key-value pairs
		const allKeys = await env.COMIC_METADATA.list();

		// delete a key-value pair
		await env.COMIC_METADATA.delete('KEY');

		// return a Workers response
		return new Response(
			JSON.stringify({
				value: value,
				allKeys: allKeys,
			}, null, 2),
			{
				headers: {
					'Content-Type': 'application/json;charset=UTF-8',
				},
			}
		);
	},
} satisfies ExportedHandler<Env>;
