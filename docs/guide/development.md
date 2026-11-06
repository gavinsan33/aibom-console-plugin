# Development

The plugin was scaffolded from [`openshift/console-plugin-template`](https://github.com/openshift/console-plugin-template). See that project's README for the underlying dynamic-plugin mechanics (module federation, the `ConsolePlugin` CR, i18n, linting rules).

## Running locally

```sh
yarn install
yarn start            # dev server on :9001
```

In a second terminal:

```sh
oc login
yarn start-console    # runs the OpenShift console in a container, connected to your cluster
```

Then open <http://localhost:9000/aiboms>.

### How the two processes fit together

- **`yarn start`** serves the plugin's JavaScript on `:9001` and rebuilds it when you save. It only serves the plugin bundle, so opening `:9001` in a browser shows nothing useful.
- **`yarn start-console`** (`start-console.sh`) runs the OpenShift console in a podman or docker container on `:9000`. It loads this plugin from `:9001` and sends API calls to the cluster you're logged into with `oc`.

After you save a change, refresh the browser to pick up the rebuilt plugin.

### What you'll see

The local console skips its own login and uses your `oc` token, so it shows exactly what your `oc` user can read. To see anything, the cluster needs:

- the AIBOM CRDs from `aibom-webhook-service`, and some `AIBOM` objects in namespaces your user can read;
- for the Telemetry tabs, AIBOMs with stored telemetry, and read access to their `AIBOMTelemetry` objects (granted by the webhook chart's `aibom-view` role).

An empty list or empty charts usually means missing RBAC or data, not a plugin bug. Check with `oc get aibomrun -A` and `oc get aibomtelemetries -n <namespace>`.

## Testing

```sh
yarn test    # Jest unit tests (filter/sort/flexible-number utilities, table rendering)
yarn lint    # eslint + prettier + stylelint
yarn build   # production build
```

`./test-frontend.sh` runs the CI unit-test checks: it fails if `yarn i18n` would change `locales/` or if `yarn.lock` has duplicate resolutions, then runs `yarn test`. It doesn't lint or build.

!!! note "Keep in sync with oc-aibom"
    The `filter`, `sort` and `flexible` utilities under `src/utils/` are a direct TypeScript port of `oc-aibom`'s `internal/aibom/{filter,sort,flexible}.go`. They use the same field mapping, the same case-insensitive exact-match semantics, and the same missing-metric and unparseable-date edge cases. If either side changes, change the other.
