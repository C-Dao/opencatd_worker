<h1 align="center">Deploy OpenCat for Team on the Edges</h1>
<p>
  <a href="/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

  


**This is a open source implementation of [OpenCat for Team](https://opencat.app/) backend for edge platforms.**


**Supported platforms:**

- **[Cloudflare Workers](#deploy-to-cloudflare-workers-with-wrangler)**
- **[Deno](#run-locally-with-deno)**
- **[Deno Deploy](#deploy-to-deno-deploy-with-deployctl) *(requires kv beta access)***

*This project uses Cloudflare KV or Deno KV as backend database.*

## Deploy to Cloudflare Workers With Wrangler
>Before you begin, you need to have a [Cloudflare](https://www.cloudflare.com/) account and be able to use [Cloudflare Workers](https://www.cloudflare.com/zh-cn/products/workers/). Have a joy!

**1. Git clone the repo and enter repo**
```sh
 cd ./opencatd_worker
```
**2. Install dependencies**
```sh
 yarn
```
**3. Copy `wrangler.toml.bak` to `wrangler.toml`**
```sh
 cp wrangler.toml.bak wrangler.toml
```
**4. Create Cloudflare KV Namespace**
```sh
 npx wrangler kv:namespace create OPENCAT_DB
```
**5. Then, copy the created Cloudflare KV config into wrangler.toml, replace 'xxxx...' into your created Cloudflare KV ID.**
```toml
[[kv_namespaces]]
binding = "OPENCAT_DB"
id = "xxxxx"
```

**6. Custom domain, edit the route configuration in wrangler.toml, rename "xxxxxx..." into your custom domain**
```toml
[[routes]]
pattern = "xxxxx"
custom_domain = true
```

**7. Use wrangler deploy**
```sh
 yarn deploy
```

## Run locally with Deno
>You need to have Deno >= 1.32 installed.

**1. Install Deno**
> MacOS user can use under command line to install deno. [Read the official document to learn more](https://deno.land/manual@v1.32.3/getting_started/installation#download-and-install) 
```sh
 brew install deno
```
**2. Copy .env.bak to .env**
```sh
 cp .env.bak .env
```
**3. Run with Deno**
> Just do it, Deno includes a kv database on the local environment, deno kv database likes a localStorage, you can simple use it. [learning more, you can see the comments](https://github.com/C-Dao/opencatd_worker/pull/2#issuecomment-1493372743).
```sh
 deno run -A --unstable src/server-deno.ts
```

## Deploy to Deno Deploy with Deployctl
> You need to sign up [Deno deploy](https://deno.com/deploy) <br/>
> You need to have Deno >= 1.32 installed.<br/>
> [Learning how to use Deployctl](https://deno.com/deploy/docs/deployctl)

**1. Install Deno**
> MacOS user can use under command line to install deno. [Read the official document to learn more](https://deno.land/manual@v1.32.3/getting_started/installation#download-and-install) 
```sh
 brew install deno
```

**2. Install deployctl**
```sh
deno install --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f https://deno.land/x/deploy/deployctl.ts
```
**3. Deploy**

```sh
deployctl deploy --project=opencat_worker src/server-deno.ts
```

## Contribution
> Run `yarn start` to start development
```sh
 yarn start
```

## License
This project is [MIT](./LICENSE) licensed.
