interface KV {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
}

class DeployKV implements KV {
    kv: Deno.Kv;
    constructor(kv: Deno.Kv) { this.kv = kv; }
    async get(key: string) { const r = await this.kv.get(["player_cache", key]); return r.value; }
    async set(key: string, value: any, ttl?: number) { await this.kv.set(["player_cache", key], value, ttl ? { expireIn: ttl } : undefined); }
}

const CACHE_DIR = ".kv_cache";
class LocalKV implements KV {
    private getPath(key: string) {
        return `${CACHE_DIR}/${key}`;
    }

    private async exists(path: string): Promise<boolean> {
        try {
            await Deno.stat(path);
            return true;
        } catch (e) {
            if (e instanceof Deno.errors.NotFound) return false;
            throw e;
        }
    }

    async get(key: string): Promise<any> {
        try {
            const path = this.getPath(key);
            return await Deno.readTextFile(path);
        } catch {
            return undefined;
        }
    }

    async set(key: string, value: any): Promise<void> {
        if (!await this.exists(CACHE_DIR)) {
            await Deno.mkdir(CACHE_DIR);
        }
        const path = this.getPath(key);
        if (!await this.exists(path)) {
            await Deno.writeTextFile(path, value, { createNew: true });
        }
    }
}

export async function createKV(): Promise<KV> {
    const isDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
    if (isDeploy) {
        return new DeployKV(await Deno.openKv());
    } else {
        return new LocalKV();
    }
}