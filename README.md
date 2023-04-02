<h1 align="center">Deploy OpenCat for Team on the Edges</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.1.0-blue.svg?cacheSeconds=2592000" />
  <a href="/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

This is a open source implementation of [OpenCat for Team](https://opencat.app/) Backend for edge platforms.

Supported platforms:

- Cloudflare Workers
- Deno
- Deno Deploy *(requires kv beta access)*

This project uses Cloudflare KV or Deno KV as backend database.

## Run locally with Deno

You need to have Deno >= 1.32 installed.

```sh
 deno run -A --unstable deno/index.ts
```

## Deploy to Cloudflare Workers
>Before you begin, you need to have a Cloudflare account and be able to use Cloudflare Worker. Have a joy!
### 1. Git clone the repo and enter repo
```sh
 cd ./opencatd_worker
```
### 2. Install dependencies
```sh
 yarn
```
### 3. Copy `wrangler.bak.toml` to `wrangler.toml`
```sh
 cp wrangler.bak.toml wrangler.toml
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


## Dev
Run `yarn start` to start development
```sh
 yarn start
```

## License

Copyright © 2023 [BenMix](https://github.com/C-Dao).<br />
This project is [MIT](./LICENSE) licensed.
