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

`./test-frontend.sh` runs the template's OpenShift CI unit-test checks (GitHub CI doesn't run it): it fails if `yarn i18n` would change `locales/` or if `yarn.lock` has duplicate resolutions, then runs `yarn test`. It doesn't lint or build.

!!! note "Keep in sync with oc-aibom"
    The `filter`, `sort` and `flexible` utilities under `src/utils/` are a direct TypeScript port of `oc-aibom`'s `internal/aibom/{filter,sort,flexible}.go`. They use the same field mapping, the same case-insensitive exact-match semantics, and the same missing-metric and unparseable-date edge cases. If either side changes, change the other.

## Building and pushing

### Container image

```sh
just docker-build    # build the image locally
just docker-push     # push to Quay (requires `docker login quay.io`)
just deploy-local    # build, push and deploy in one go
```

Every push to `main` builds the image through `.github/workflows/images.yml`, tagged `:latest` and `:<short sha>`.

### Helm chart

```sh
just chart-push      # requires `helm registry login quay.io`
```

Without `--version`, this publishes a dev build versioned from the latest release tag: the next patch, the commits since the tag and the SHA (for example `0.1.1-dev.5.gabc1234` five commits after `v0.1.0`). Newer builds sort higher, and all sort below the next release. Helm skips these unless you pass `--devel` or the exact version. CI does this on every merge to `main` that touches the chart.

**Releases.** Push a `vX.Y.Z` tag. `.github/workflows/release.yml` builds the image as `quay.io/project-aibom/aibom-console-plugin:X.Y.Z`, then runs `just chart-push --version=X.Y.Z`, which publishes the chart with `version` and `appVersion` set to `X.Y.Z`, so its image defaults to that build, and attaches the chart tarball to a GitHub release for the tag. A release is only ever pushed once. `Chart.yaml`'s `version` is unused and never needs bumping.

**Checking a release for the catalog.** `just chart-verify --version=X.Y.Z` packages the chart and runs Red Hat's chart-verifier with the community profile, writing a report to `chart-verifier/`. Only `helm-lint` is mandatory for a community chart. `images-are-certified` fails and is expected to; it's mandatory only for certified partner charts.

### Publishing to the OpenShift Helm catalog

The chart is submitted to [openshift-helm-charts/charts](https://github.com/openshift-helm-charts/charts) as a community chart alongside the webhook's two charts, which puts it in every OpenShift cluster's Developer Catalog.

1. **Once, register the chart.** In a fork of that repository, add `catalog/community/project-aibom/aibom-console/OWNERS` at `charts/community/project-aibom/aibom-console/OWNERS` and open a pull request to `main`. Its CI always reports it as failed ("OWNERS file changes require manual review by maintainers"); a maintainer reviews and merges it by hand. Only the GitHub users listed in `users` can submit versions.
2. **For each release you want in the catalog,** run `just catalog-submit --version=X.Y.Z` as a user listed in OWNERS. It adds the tarball from the release's GitHub release to your fork as `charts/community/project-aibom/aibom-console/X.Y.Z/aibom-console-X.Y.Z.tgz` on a branch off the catalog's `main` and opens a pull request. Releases from before `release.yml` attached the tarball can't be submitted. It refuses a version that's already in the catalog or already has an open pull request. Pass `--dry-run` to see what it would push, or `--fork=<owner/repo>` if your fork isn't `<you>/charts`. The catalog's `chart-testing` check fails and is expected to: its CI installs with a namespace-scoped service account, and the chart needs cluster-admin. CI reports community charts as "Pending Manual Review"; a maintainer approves each version, then the bot merges it. A published version can't be changed or withdrawn; release a new one instead.
