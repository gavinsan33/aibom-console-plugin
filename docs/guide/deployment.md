# Deployment

Log in to your cluster and deploy:

```sh
oc login
just deploy
```

This pulls the latest chart and image from `quay.io/gsanders/aibom-console-plugin` and installs to the `project-aibom` namespace. Pass `--namespace=<ns>` to change it.

## Common options

Pin a specific version:

```sh
just deploy --version=0.1.0-abc1234
```

Deploy from a different Quay org or with custom values:

```sh
just deploy --repo=quay.io/your-org --values=values-prod.yaml
```

Or use Helm directly:

```sh
helm upgrade -i aibom-console-plugin oci://quay.io/gsanders/aibom-console-plugin \
  -n aibom-console-plugin --create-namespace
```

See `charts/aibom-console-plugin/values.yaml` for all configuration options.

## Feature flags

| Value | Default | Description |
|-------|---------|-------------|
| `plugin.featureFlags.telemetryTab` | `true` | Shows the Telemetry tab on the Detail and Compare views. |
| `plugin.featureFlags.csvExport` | `false` | Shows the CSV **Download** menu on the List and Detail views. Off by default. |

For example, to turn on CSV export:

```sh
helm upgrade -i aibom-console-plugin oci://quay.io/gsanders/aibom-console-plugin \
  -n aibom-console-plugin --create-namespace --set plugin.featureFlags.csvExport=true
```

The flags are rendered into a ConfigMap the plugin reads at runtime, so changing them needs no image rebuild.

## Building and pushing

### Container image

```sh
just docker-build    # build the image locally
just docker-push     # push to Quay (requires `docker login quay.io`)
just deploy-local    # build, push and deploy in one go
```

Images auto-build on every push to `main` through Quay's GitHub build trigger, pushing both `:latest` (mutable) and `:<commit_sha>` (immutable) tags. One-time setup: add a GitHub build trigger in the Quay UI for this repository (branch `main`, Dockerfile `/Dockerfile`).

### Helm chart

```sh
just chart-push      # requires `helm registry login quay.io`
```

This publishes both a mutable version tag (for example `0.1.0`) and an immutable, SHA-pinned tag (for example `0.1.0-abc1234`) for rollback safety.
