# AIBOM Console Plugin

Adds AIBOM views to the OpenShift web console: list, filter and compare the `AIBOM` records the AIBOM webhook creates, check their signatures, and chart their stored telemetry. It appears under **Workloads → AIBOMs**.

Full documentation: https://gavinsan33.github.io/project-aibom/

## Install

Needs OpenShift 4.22 or later. Install the `aibom-webhook` chart first: it provides the `AIBOM` CRDs and the `aibom-view` role the views read with. A cluster-admin installs this chart, because it creates a cluster-scoped `ConsolePlugin` and enables it on the console operator:

```bash
helm upgrade --install aibom-console-plugin oci://quay.io/project-aibom/aibom-console \
  -n aibom-console-plugin --create-namespace --version <version>
```

A post-install Job adds the plugin to `spec.plugins` on `consoles.operator.openshift.io/cluster`. Reload the console once it finishes. Set `plugin.jobs.patchConsoles.enabled=false` to enable the plugin yourself instead.

- `plugin.featureFlags.telemetryTab` (default `true`) shows the Telemetry tab on the Detail and Compare views.
- `plugin.featureFlags.csvExport` (default `false`) shows the CSV **Download** menu.

Run `helm test aibom-console-plugin -n aibom-console-plugin` to check that the plugin serves its assets.

## Uninstall

`helm uninstall` runs a pre-delete Job that takes the plugin out of `spec.plugins` again. If that Job can't run, uninstall with `--no-hooks` and remove it by hand:

```bash
oc get consoles.operator.openshift.io cluster -o json \
  | jq '.spec.plugins -= ["aibom-console-plugin"]' | oc apply -f -
```
