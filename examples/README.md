# Sample AIBOMs

Fake `aibom.io/v1` `AIBOM` custom resources for exercising this
plugin's List, Detail, and Compare views without needing a real
`aibom-webhook-service`-instrumented training/serving run.

- `aibom-granite-lora-finetune-run1.yaml` — a completed LoRA fine-tune,
  int4, 2x A100, dataset matches its declared name, full hardware telemetry.
- `aibom-granite-lora-finetune-run2.yaml` — a second run of the *same job*
  with different config (int8/qlora, 1x H100, higher learning rate) and a
  dataset that **does not** match its declared name (`matches_declared:
  false`) — pairs with run1 to exercise the List view's drift filter and
  the Compare view's divergent-field highlighting. Also `OOMKilled`, to
  exercise the pod-status coloring.
- `aibom-vllm-inference.yaml` — a vLLM serving workload, to exercise the
  Detail view's Inference section/Inference Performance table.

## Apply

These default to the `project-gavin-test` namespace — edit `metadata.namespace`
in each file first (`oc apply -n` can't override a namespace set in the file),
then:

```sh
oc apply -n <your-namespace> -f examples/
```

You'll need `aibom-webhook-service`'s CRD (`aiboms.aibom.io`) already
installed on the cluster, and create access on `aiboms.aibom.io` in the
target namespace (the same access a workload's postprocess Job would have).

## Notes

- **`spec` is immutable once created** (the CRD enforces this with a CEL
  validation rule) — to change one of these after applying, `oc delete` and
  re-apply rather than editing in place.
- These have no `spec.data.telemetry_series_ref` (no stored `AIBOMTelemetry`
  series), so the **Telemetry** tabs show their empty state — they chart only
  stored series, never live Prometheus. Everything else (List filtering/sorting,
  Detail's Overview tab, Compare) works fully offline against just the CR
  data.
