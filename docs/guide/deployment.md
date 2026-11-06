# Deployment

Log in to your cluster and deploy:

```sh
oc login
just deploy
```

This installs the newest release of the `oci://quay.io/project-aibom/aibom-console` chart, which runs the image built for that release, into the `aibom-console-plugin` namespace. Pass `--namespace=<ns>` to change it.

## Common options

Pin a release, or install the newest dev build from `main`:

```sh
just deploy --version=0.1.0
just deploy --devel
```

Deploy from a different Quay org or with custom values:

```sh
just deploy --repo=quay.io/your-org --values=values-prod.yaml
```

Or use Helm directly:

```sh
helm upgrade -i aibom-console-plugin oci://quay.io/project-aibom/aibom-console \
  -n aibom-console-plugin --create-namespace
```

See `charts/aibom-console/values.yaml` for all configuration options.

## Uninstall

```sh
just uninstall
```

This removes the Helm release (including the `ConsolePlugin` CR) and un-registers the plugin from the console operator. Pass `--namespace=<ns>` if you deployed elsewhere.

Or do it by hand. `helm uninstall` removes the chart's resources but does **not** undo the patcher job's edit to the console operator, which added the plugin to `spec.plugins`:

```sh
helm uninstall aibom-console-plugin -n aibom-console-plugin
oc get consoles.operator.openshift.io cluster -o json \
  | jq '.spec.plugins -= ["aibom-console-plugin"]' \
  | oc apply -f -
```

## Feature flags

| Value | Default | Description |
|-------|---------|-------------|
| `plugin.featureFlags.telemetryTab` | `true` | Shows the Telemetry tab on the Detail and Compare views. |
| `plugin.featureFlags.csvExport` | `false` | Shows the CSV **Download** menu on the List and Detail views. Off by default. |

For example, to turn on CSV export:

```sh
helm upgrade -i aibom-console-plugin oci://quay.io/project-aibom/aibom-console \
  -n aibom-console-plugin --create-namespace --set plugin.featureFlags.csvExport=true
```

The flags are rendered into a ConfigMap the plugin reads at runtime, so changing them needs no image rebuild.
