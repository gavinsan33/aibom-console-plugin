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

## Argo CD

The chart can be managed by Argo CD, including OpenShift GitOps, alongside the webhook's charts ([Installing with Argo CD](https://github.com/gavinsan33/aibom-webhook-service/blob/main/docs/user-guide/argocd.md)):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: aibom-console-plugin
  namespace: openshift-gitops
spec:
  project: default
  source:
    repoURL: quay.io/project-aibom
    chart: aibom-console
    targetRevision: <version>
  destination:
    server: https://kubernetes.default.svc
    namespace: aibom-console-plugin
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - CreateNamespace=true
```

Set values, such as the [feature flags](#feature-flags), under `spec.source.helm.valuesObject`.

The plugin is enabled by the chart's patcher Job, a Helm `post-install,post-upgrade` hook that adds it to `spec.plugins` on `consoles.operator.openshift.io/cluster`. Argo CD runs that hook as a `PostSync` hook, so it runs after every sync rather than only on install and upgrade. It merges the plugin into the existing list, so repeating it is harmless. Keep the `Console` object itself out of Git: other operators add their plugins to the same list.

**Permissions.** The default `openshift-gitops` instance can already create the chart's `ConsolePlugin`, ClusterRole and ClusterRoleBinding, but nothing else in a namespace it doesn't manage. Either give its controller cluster-admin, or label the plugin's namespace `argocd.argoproj.io/managed-by=openshift-gitops` before the first sync.

**Removing.** Argo CD versions that ignore Helm `pre-delete` hooks skip the chart's removal Job, so deleting the Application leaves the plugin in `spec.plugins`, and the console keeps trying to load it. Remove it by hand with the `oc` command under [Uninstall](#uninstall).

## Uninstall

```sh
just uninstall
```

This removes the Helm release, including the `ConsolePlugin` CR, the same as `helm uninstall aibom-console-plugin -n aibom-console-plugin` (or **Uninstall Helm Release** in the console). Pass `--namespace=<ns>` if you deployed elsewhere. The chart's pre-delete Job takes the plugin out of `spec.plugins` on the console operator, undoing the patcher Job.

If that Job can't run, uninstall with `--no-hooks` and remove the plugin from `spec.plugins` by hand:

```sh
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
