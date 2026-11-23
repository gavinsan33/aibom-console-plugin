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

# Uninstall the console plugin: remove the Helm release, including the
# ConsolePlugin CR. The chart's pre-delete Job takes the plugin out of the
# console operator's spec.plugins, so this needs cluster-admin.
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
    helm uninstall aibom-console-plugin -n "$namespace" --kube-as-user=system:admin

# --- Chart publishing --------------------------------------------------------
#
# Packages the console plugin chart and pushes it as an OCI artifact to Quay,
# so `helm upgrade --install ... oci://quay.io/<org>/aibom-console`
# works with no checked-out copy of this repo. One-time setup: `helm registry
# login quay.io` with an account/robot that has push access under that org,
# and (in the Quay UI) make the chart repo public, or install accepts
# credentials some other way.
#
# Without --version, publishes a dev build versioned from the latest vX.Y.Z
# tag: the next patch, the commits since the tag and the sha, e.g.
# 0.1.1-dev.5.gabc1234 ("-dirty" suffixed if the working tree has uncommitted
# changes). That sorts after the tag's release and in commit order, so
# Chart.yaml's version is never bumped. Immutable, one per run. Its image is :latest
# (appVersion "latest" in a checkout). The SemVer prerelease hyphen means
# `helm install` with no --version skips dev builds and takes the newest
# release; pass --devel or an exact --version to install one.
#
# With --version=X.Y.Z, publishes a release instead: the chart as X.Y.Z with
# appVersion X.Y.Z, so its image defaults to :X.Y.Z -- the tag
# .github/workflows/release.yml builds from the same git tag. Refuses a version
# that's already published: a release is pushed once.
# --out keeps the package, which release.yml attaches to the GitHub release.
# Usage: just chart-push [--version=X.Y.Z] [--repo=<repo>] [--out=<dir>]
[group('charts')]
chart-push *args:
    #!/usr/bin/env bash
    set -euo pipefail
    repo="{{ default_repo }}"
    version=""
    out=""
    for arg in {{ args }}; do
        case "$arg" in
            --version=*) version="${arg#--version=}" ;;
            --repo=*) repo="${arg#--repo=}" ;;
            --out=*) out="${arg#--out=}" ;;
            *) echo "error: unknown argument '$arg' (expected --version=X.Y.Z, --repo=<repo> or --out=<dir>)" >&2; exit 1 ;;
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
        desc="$(git describe --tags --long --dirty --match 'v[0-9]*.[0-9]*.[0-9]*')" || { echo "error: no vX.Y.Z tag to version a dev build from" >&2; exit 1; }
        [[ "$desc" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)-([0-9]+)-(g[0-9a-f]+(-dirty)?)$ ]] || { echo "error: can't parse git describe output '$desc'" >&2; exit 1; }
        version="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.$((BASH_REMATCH[3] + 1))-dev.${BASH_REMATCH[4]}.${BASH_REMATCH[5]}"
    fi
    if [[ -z "$out" ]]; then
        out="$(mktemp -d)"
        trap 'rm -rf "$out"' EXIT
    fi
    helm package charts/aibom-console -d "$out" --version "$version" "${app_version_args[@]}"
    helm push "$out/aibom-console-$version.tgz" "oci://$repo"
    echo "pushed oci://$repo/aibom-console --version=$version"

# Runs Red Hat's chart-verifier on the chart, packaged as <version>, with the
# community profile the OpenShift Helm catalog uses. Skips chart-testing, which
# installs the chart into a cluster. Writes the report to <out>.
# Needs podman or docker.
# Usage: just chart-verify [--version=<semver>] [--out=<dir>]
[group('charts')]
chart-verify *args:
    #!/usr/bin/env bash
    set -euo pipefail
    version="$(git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*')"
    version="${version#v}"
    out="chart-verifier"
    for arg in {{ args }}; do
        case "$arg" in
            --version=*) version="${arg#--version=}" ;;
            --out=*) out="${arg#--out=}" ;;
            *) echo "error: unknown argument '$arg' (expected --version=<semver> or --out=<dir>)" >&2; exit 1 ;;
        esac
    done
    runtime="$(command -v podman || command -v docker)" || { echo "error: needs podman or docker" >&2; exit 1; }
    mkdir -p "$out"
    helm package charts/aibom-console -d "$out" --version "$version" --app-version "$version" >/dev/null
    out="$(cd "$out" && pwd)"
    "$runtime" run --rm -v "$out:/charts:z" quay.io/redhat-certification/chart-verifier:latest \
        verify "/charts/aibom-console-$version.tgz" -x chart-testing --set profile.vendortype=community \
        > "$out/aibom-console-$version-report.yaml"
    echo "aibom-console: $out/aibom-console-$version-report.yaml"
    grep -B2 'outcome: FAIL' "$out/aibom-console-$version-report.yaml" | grep 'check:' | sed 's/^ */  failed: /' || true

# Submits the chart at <version> to the OpenShift Helm catalog
# (openshift-helm-charts/charts): a branch and pull request from your fork
# adding the chart's tarball from the vX.Y.Z GitHub release.
# Run it as a GitHub user listed in catalog/**/OWNERS, since the catalog's CI
# checks who opened the pull request. Refuses a version that's already in the
# catalog or already has an open pull request. --dry-run commits in a temporary
# clone and stops before pushing. Needs a logged-in gh and a fork of the catalog.
# Usage: just catalog-submit [--version=<semver>] [--fork=<owner/repo>] [--dry-run]
[group('charts')]
catalog-submit *args:
    #!/usr/bin/env bash
    set -euo pipefail
    upstream="openshift-helm-charts/charts"
    chart="aibom-console"
    version="$(git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*')"
    version="${version#v}"
    fork=""
    dry_run=false
    for arg in {{ args }}; do
        case "$arg" in
            --version=*) version="${arg#--version=}" ;;
            --fork=*) fork="${arg#--fork=}" ;;
            --dry-run) dry_run=true ;;
            *) echo "error: unknown argument '$arg' (expected --version=<semver>, --fork=<owner/repo> or --dry-run)" >&2; exit 1 ;;
        esac
    done
    repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
    [ -n "$fork" ] || fork="$(gh api user -q .login)/charts"
    gh repo view "$fork" --json name >/dev/null 2>&1 \
        || { echo "error: no fork $fork; fork $upstream first, or pass --fork=<owner/repo>" >&2; exit 1; }
    assets="$(gh release view "v$version" -R "$repo" --json assets -q '.assets[].name' 2>/dev/null)" \
        || { echo "error: $repo has no GitHub release v$version" >&2; exit 1; }
    grep -qx "$chart-$version.tgz" <<<"$assets" \
        || { echo "error: release v$version has no $chart-$version.tgz" >&2; exit 1; }
    title="Add project-aibom/$chart $version"
    if gh api "repos/$upstream/contents/charts/community/project-aibom/$chart/$version" --silent 2>/dev/null; then
        echo "error: $chart $version is already in the catalog" >&2; exit 1
    fi
    open="$(gh pr list -R "$upstream" --state open --search "\"$title\" in:title" --json title,url \
        -q ".[] | select(.title == \"$title\") | .url")"
    [ -z "$open" ] || { echo "error: $chart $version already has an open pull request: $open" >&2; exit 1; }
    work="$(mktemp -d)"
    trap 'rm -rf "$work"' EXIT
    gh release download "v$version" -R "$repo" -p "$chart-$version.tgz" -D "$work/dist"
    git clone -q --depth 1 --filter=blob:none --sparse "https://github.com/$upstream.git" "$work/catalog"
    cd "$work/catalog"
    git sparse-checkout set charts/community/project-aibom
    git remote add fork "https://github.com/$fork.git"
    branch="project-aibom-$chart-$version"
    dir="charts/community/project-aibom/$chart/$version"
    git switch -q -C "$branch" origin/main
    mkdir -p "$dir"
    cp "$work/dist/$chart-$version.tgz" "$dir/"
    git add "$dir"
    git commit -q -m "$title"
    if $dry_run; then
        echo "dry run: would push $fork:$branch and open \"$title\" with:"
        git show --stat --format= HEAD | sed 's/^/  /'
        exit 0
    fi
    git push -q fork "$branch"
    gh pr create -R "$upstream" --base main --head "${fork%%/*}:$branch" --title "$title" \
        --body "Chart tarball for community chart \`project-aibom/$chart\` $version."
