<h1 align="center">Deploy OpenCat for Team on the Edges</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.1.0-blue.svg?cacheSeconds=2592000" />
  <a href="/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

  


This is a open source implementation of [OpenCat for Team](https://opencat.app/) backend for edge platforms.

Supported platforms:

- [Cloudflare Workers](#deploy-to-cloudflare-workers)
- [Deno](#run-locally-with-Deno)
- [Deno Deploy]() *(requires kv beta access)*

This project uses Cloudflare KV or Deno KV as backend database.

## Deploy to Cloudflare Workers With Wrangler
>Before you begin, you need to have a [Cloudflare](https://www.cloudflare.com/) account and be able to use [Cloudflare Workers](https://www.cloudflare.com/zh-cn/products/workers/). Have a joy!
### 1. Git clone the repo and enter repo
```sh
 cd ./opencatd_worker
```
### 2. Install dependencies
```sh
 yarn
```
### 3. Copy `wrangler.toml.bak` to `wrangler.toml`
```sh
 cp wrangler.toml.bak wrangler.toml
```
### 4. Create Cloudflare KV Namespace 
```sh
 npx wrangler kv:namespace create OPENCAT_DB
```
### 5. Then, copy the created Cloudflare KV config into wrangler.toml, replace 'xxxx...' into your created Cloudflare KV ID.
```toml
 kv_namespaces = [{ binding = "OPENCAT_DB", id = "xxxxxxxxxxx" }]
```

### 6. Custom domain, edit the route configuration in wrangler.toml, rename "xxxxxx..." into your custom domain
```toml
 routes = [{ pattern = "xxxxxxxx", custom_domain = true }]
```


### 7. Use wrangler deploy
```sh
 yarn deploy
```

## Run locally with Deno
>You need to have Deno >= 1.32 installed.

### 1. Install Deno
MacOS user can use under command line to install deno. [Read the official document to learn more](https://deno.land/manual@v1.32.3/getting_started/installation#download-and-install) 
```sh
 brew install deno
```
### 2. Run with Deno
```sh
 deno run -A --unstable src/server-deno.ts
```

## Deploy to Deno Deploy

> You need to have Deno >= 1.32 installed.

```sh
 deno run -A --unstable src/server-deno.ts
```
## Dev
Run `yarn start` to start development
```sh
 yarn start
```

## License

Copyright © 2023 [BenMix](https://github.com/C-Dao).<br />
This project is [MIT](./LICENSE) licensed.
