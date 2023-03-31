<h1 align="center">Deploy OpenCat for Team on Cloudflare Worker</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <a href="/LICENSE.md" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

> This is a open source implement of [OpenCat for Team](https://opencat.app/) Backend. <br />
> You can deploy this backend service on Cloudflare Worker. <br />
> This Project use Cloudflare KV as backend database. 

## Deploy

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
### 5. Then, copy the created Cloudflare KV config into wrangler.toml
```sh
 kv_namespaces = [{ binding = "OPENCAT_DB", id = "xxxxxxxxxxx" }]
```

### 6. Custom domain
```sh
 routes = [{ pattern = "xxxxxxxx", custom_domain = true }]
```


### 6. Use wrangler deploy
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
