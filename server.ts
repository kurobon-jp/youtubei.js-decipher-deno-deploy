import { Innertube } from "youtubei.js";
import * as esbuild from "esbuild";
import { createKV } from "./kv.ts";

Deno.serve(async (req: Request) => {
    const url = new URL(req.url);
    const playerId = url.searchParams.get("player_id");
    if (playerId === null || playerId === "") {
        return new Response(`Missing player_id param`, { status: 400 });
    }

    try {
        const kv = await createKV();
        let code: string | undefined;
        code = await kv.get(playerId);
        if (!code) {
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
            code = result.code;
            await kv.set(playerId, code, 3600);
            esbuild.stop();
        }

        return new Response(code, { status: 200 });
    } catch (error) {
        return new Response(`${error}`, { status: 500 });
    }
});