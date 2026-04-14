import { Innertube } from "youtubei.js";
import * as esbuild from "esbuild";
import { createKV } from "./kv.ts";

const encoder = new TextEncoder();

Deno.serve(async (req: Request) => {
    const url = new URL(req.url);
    const playerId = url.searchParams.get("player_id");
    if (playerId === null || playerId === "") {
        return new Response(`Missing player_id param`, { status: 400 });
    }

    try {
        const kv = await createKV();
        let buffer: ArrayBuffer | undefined;
        buffer = await kv.get(playerId);
        if (!buffer) {
            const innertube = await Innertube.create({ player_id: playerId })
            const playerData: any = innertube.session.player?.data
            if (!playerData) {
                throw Error(`Failed to get player data`);
            }

            const result = await esbuild.transform(playerData.output, {
                minifyWhitespace: true,
                minifyIdentifiers: true,
                minifySyntax: true,
            });

            buffer = await compress(result.code);
            await kv.set(playerId, buffer, 3600);
            esbuild.stop();
        }

        const headers = new Headers(
        {
            "cache-control": "public, max-age=86400"
        });

        return new Response(buffer, { status: 200, headers });
    } catch (error) {
        return new Response(`${error}`, { status: 500 });
    }
});

async function compress(str: string): Promise<ArrayBuffer> {
  const cs = new CompressionStream("gzip");
  const buf = encoder.encode(str);
  const stream = new Response(buf).body!.pipeThrough(cs);
  return new Response(stream).arrayBuffer();
}
