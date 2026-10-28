# Run `just` with no arguments to see this list.
default:
    @just --list

# quay.io org/user to push images and charts to, e.g. quay.io/<your-org>.
# Override per-invocation with --repo=<repo>.
default_repo := "quay.io/project-aibom"

# --- Container image ---------------------------------------------------------

[group('images')]
docker-build *args:
    #!/usr/bin/env bash
    set -euo pipefail
    repo="{{ default_repo }}"
    no_latest=false
    img="aibom-console-plugin:latest"
    for arg in {{ args }}; do
        case "$arg" in
            --img=*) img="${arg#--img=}" ;;
            --repo=*) repo="${arg#--repo=}" ;;
            --no-latest) no_latest=true ;;
            *) echo "error: unknown argument '$arg' (expected --img=<image>, --repo=<repo>, or --no-latest)" >&2; exit 1 ;;
        esac
    done
    if [[ "$no_latest" = true ]]; then
        sha="$(git rev-parse --short HEAD)"
        git diff --quiet HEAD || sha="${sha}-dirty"
        img="aibom-console-plugin:${sha}"
    fi
    docker build -t "$repo/$img" .

[group('images')]
docker-push *args:
    #!/usr/bin/env bash
    set -euo pipefail
    repo="{{ default_repo }}"
    no_latest=false
    img="aibom-console-plugin:latest"
    for arg in {{ args }}; do
        case "$arg" in
            --img=*) img="${arg#--img=}" ;;
            --repo=*) repo="${arg#--repo=}" ;;
            --no-latest) no_latest=true ;;
            *) echo "error: unknown argument '$arg' (expected --img=<image>, --repo=<repo>, or --no-latest)" >&2; exit 1 ;;
        esac
    done
    if [[ "$no_latest" = true ]]; then
        sha="$(git rev-parse --short HEAD)"
        git diff --quiet HEAD || sha="${sha}-dirty"
        img="aibom-console-plugin:${sha}"
    fi
    docker push "$repo/$img"

# --- Cluster deployment --------------------------------------------------------

# Every recipe below that talks to a cluster depends on this, so it always runs first.
_check-auth:
    @oc whoami >/dev/null 2>&1 || { echo "error: not logged in to a cluster — run 'oc login' first" >&2; exit 1; }

# Build the image locally and push it to quay.io, then install/upgrade the
# chart with that image. Useful for iterating without a git-push round trip.
# Requires the caller already logged in (`docker login quay.io` / `podman login
# quay.io`) with push access to that repo.
#
# Defaults to the local working tree's short SHA, suffixed "-dirty" if there
# are uncommitted changes. Pass --skip-patcher to disable the auto-patcher job
# and avoid needing cluster-admin.
# Usage: just deploy-local [--repo=<repo>] [--version=<tag>] [--values=<file>] [--namespace=<ns>] [--skip-patcher]
[group('deploy')]
deploy-local *args: _check-auth
    #!/usr/bin/env bash
    set -euo pipefail
    engine=docker
    command -v docker >/dev/null 2>&1 || engine=podman
    repo="{{ default_repo }}"
    version=""
    values_file=""
    namespace="aibom-console-plugin"
    skip_plugin_cr=false
    skip_patcher=false
    for arg in {{ args }}; do
        case "$arg" in
            --repo=*) repo="${arg#--repo=}" ;;
            --version=*) version="${arg#--version=}" ;;
            --values=*) values_file="${arg#--values=}" ;;
            --namespace=*) namespace="${arg#--namespace=}" ;;
            --skip-plugin-cr) skip_plugin_cr=true ;;
            --skip-patcher) skip_patcher=true ;;
            *) echo "error: unknown argument '$arg' (expected --repo=<repo>, --version=<tag>, --values=<file>, --namespace=<ns>, --skip-plugin-cr, or --skip-patcher)" >&2; exit 1 ;;
        esac
    done
    if [[ -z "$version" ]]; then
        version="$(git rev-parse --short HEAD)"
        git diff --quiet HEAD || version="${version}-dirty"
    fi
    img_repo="${repo}/aibom-console-plugin"
    img_ref="${img_repo}:${version}"
    "$engine" build -t "$img_ref" .
    "$engine" push "$img_ref"
    values_args=()
    [[ -n "$values_file" ]] && values_args=(-f "$values_file")
    [[ "$skip_plugin_cr" = true ]] && values_args+=(--set plugin.enabled=false)
    [[ "$skip_patcher" = true ]] && values_args+=(--set plugin.jobs.patchConsoles.enabled=false)
    kube_as_user_args=()
    [[ "$skip_plugin_cr" = true && "$skip_patcher" = true ]] || kube_as_user_args=(--kube-as-user=system:admin)
    helm upgrade --install aibom-console-plugin "oci://$repo/aibom-console" \
        -n "$namespace" --create-namespace \
        --set plugin.image.repository="$img_repo" --set-string plugin.image.tag="$version" \
        "${kube_as_user_args[@]}" \
        "${values_args[@]}"

# Install/upgrade the console plugin chart from Quay. Works once images are
# built and pushed (via Quay's auto-build, `just docker-push`, or `just
# deploy-local`). Seamless default: `just deploy` installs the newest release
# of oci://quay.io/project-aibom/aibom-console. Pass --version to pin a release
# or a dev build (X.Y.Z-<sha>), or --devel for the newest dev build from main.
#
# By default, `just deploy` requires cluster-admin to create cluster-scoped
# resources (ConsolePlugin CR, ClusterRole/ClusterRoleBinding, patcher Job).
# Pass --skip-plugin-cr to skip creating the ConsolePlugin CR (a cluster-admin
# must create it manually). Pass --skip-patcher to only disable the auto-patcher
# job. Use both flags together to deploy with no cluster-admin access.
#
# Usage: just deploy [--repo=<repo>] [--version=<version> | --devel] [--values=<file>] [--namespace=<ns>] [--skip-plugin-cr] [--skip-patcher]
[group('deploy')]
deploy *args: _check-auth
    #!/usr/bin/env bash
    set -euo pipefail
    repo="{{ default_repo }}"
    version_args=()
    values_file=""
    namespace="aibom-console-plugin"
    skip_plugin_cr=false
    skip_patcher=false
    for arg in {{ args }}; do
        case "$arg" in
            --repo=*) repo="${arg#--repo=}" ;;
            --version=*) version_args=(--version "${arg#--version=}") ;;
            --devel) version_args=(--devel) ;;
            --values=*) values_file="${arg#--values=}" ;;
            --namespace=*) namespace="${arg#--namespace=}" ;;
            --skip-plugin-cr) skip_plugin_cr=true ;;
            --skip-patcher) skip_patcher=true ;;
            *) echo "error: unknown argument '$arg' (expected --repo=<repo>, --version=<version>, --devel, --values=<file>, --namespace=<ns>, --skip-plugin-cr, or --skip-patcher)" >&2; exit 1 ;;
        esac
    done
    values_args=()
    [[ -n "$values_file" ]] && values_args=(-f "$values_file")
    [[ "$skip_plugin_cr" = true ]] && values_args+=(--set plugin.enabled=false)
    [[ "$skip_patcher" = true ]] && values_args+=(--set plugin.jobs.patchConsoles.enabled=false)
    kube_as_user_args=()
    [[ "$skip_plugin_cr" = true && "$skip_patcher" = true ]] || kube_as_user_args=(--kube-as-user=system:admin)
    helm upgrade --install aibom-console-plugin "oci://$repo/aibom-console" \
        -n "$namespace" --create-namespace \
        "${version_args[@]}" \
        "${kube_as_user_args[@]}" \
        "${values_args[@]}"

# Uninstall the console plugin: remove the Helm release (including the
# ConsolePlugin CR) and un-register the plugin from the console operator, which
# the patcher job added to spec.plugins and Helm does not revert. Removing it
# from spec.plugins needs cluster-admin.
#
# Usage: just uninstall [--namespace=<ns>]
[group('deploy')]
uninstall *args: _check-auth
    #!/usr/bin/env bash
    set -euo pipefail
    namespace="aibom-console-plugin"
    for arg in {{ args }}; do
        case "$arg" in
            --namespace=*) namespace="${arg#--namespace=}" ;;
            *) echo "error: unknown argument '$arg' (expected --namespace=<ns>)" >&2; exit 1 ;;
        esac
    done
    helm uninstall aibom-console-plugin -n "$namespace"
    oc get consoles.operator.openshift.io cluster -o json --kube-as-user=system:admin \
        | jq '.spec.plugins -= ["aibom-console-plugin"]' \
        | oc apply --kube-as-user=system:admin -f -

# --- Chart publishing --------------------------------------------------------
#
# Packages the console plugin chart and pushes it as an OCI artifact to Quay,
# so `helm upgrade --install ... oci://quay.io/<org>/aibom-console`
# works with no checked-out copy of this repo. One-time setup: `helm registry
# login quay.io` with an account/robot that has push access under that org,
# and (in the Quay UI) make the chart repo public, or install accepts
# credentials some other way.
#
# Without --version, publishes the chart as <Chart.yaml version>-<git sha>
# (e.g. 0.1.0-abc1234, "-dirty" suffixed if the working tree has uncommitted
# changes): a dev build, immutable, one per run. Its image is :latest
# (appVersion "latest" in a checkout). The SemVer prerelease hyphen means
# `helm install` with no --version skips dev builds and takes the newest
# release; pass --devel or an exact --version to install one.
#
# With --version=X.Y.Z, publishes a release instead: the chart as X.Y.Z with
# appVersion X.Y.Z, so its image defaults to :X.Y.Z -- the tag
# .github/workflows/release.yml builds from the same git tag. Refuses a version
# that's already published: a release is pushed once.
#
# Usage: just chart-push [--version=X.Y.Z] [--repo=<repo>]
[group('charts')]
chart-push *args:
    #!/usr/bin/env bash
    set -euo pipefail
    repo="{{ default_repo }}"
    version=""
    for arg in {{ args }}; do
        case "$arg" in
            --version=*) version="${arg#--version=}" ;;
            --repo=*) repo="${arg#--repo=}" ;;
            *) echo "error: unknown argument '$arg' (expected --version=X.Y.Z or --repo=<repo>)" >&2; exit 1 ;;
        esac
    done
    app_version_args=()
    if [[ -n "$version" ]]; then
        [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "error: --version must be X.Y.Z, got '$version'" >&2; exit 1; }
        if helm show chart "oci://$repo/aibom-console" --version "$version" >/dev/null 2>&1; then
            echo "error: oci://$repo/aibom-console $version is already published" >&2; exit 1
        fi
        app_version_args=(--app-version "$version")
    else
        sha="$(git rev-parse --short HEAD)"
        git diff --quiet HEAD || sha="${sha}-dirty"
        version="$(grep '^version:' charts/aibom-console/Chart.yaml | awk '{print $2}')-${sha}"
    fi
    pkg_dir="$(mktemp -d)"
    trap 'rm -rf "$pkg_dir"' EXIT
    helm package charts/aibom-console -d "$pkg_dir" --version "$version" "${app_version_args[@]}"
    helm push "$pkg_dir/aibom-console-$version.tgz" "oci://$repo"
    echo "pushed oci://$repo/aibom-console --version=$version"
