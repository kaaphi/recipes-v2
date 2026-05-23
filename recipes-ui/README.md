# Recipes UI

## Running dev

```shell
npm run dev
```

## Building

```shell
npm run build
```

## Adding env files

The following settings are required:
```
VITE_OAUTH_CLIENT_ID=
VITE_OAUTH_AUTHORITY=
VITE_OAUTH_DOMAIN=
```

The OAuth details can be retrieved from an existing infra stack's OAuthDetails output.

For local development, use a `.env.local` file.