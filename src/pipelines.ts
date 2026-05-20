export interface Pipeline {
  id: string;
  name: string;
  source: "github" | "ado";
  pipelineUrl: string;
}

export interface GitHubPipeline extends Pipeline {
  source: "github";
  owner: string;
  repo: string;
  workflow: string;
  params: Record<string, string>;
}

export interface ADOPipeline extends Pipeline {
  source: "ado";
  org: string;
  project: string;
  definitionId: number;
}

export type AnyPipeline = GitHubPipeline | ADOPipeline;

export interface RunResult {
  id: string;
  status: "success" | "failure" | "pending" | "cancelled" | "unknown";
  url: string;
  branch?: string;
  time: string;
}

export interface PipelineResult {
  pipeline: AnyPipeline;
  runs: RunResult[];
  error?: string;
}

export const PIPELINES: AnyPipeline[] = [
  {
    id: "gh-typespec-validation-nightly",
    name: "TypeSpec Validation All (Nightly - main)",
    source: "github",
    owner: "Azure",
    repo: "azure-rest-api-specs",
    workflow: "typespec-validation-all.yaml",
    params: { event: "schedule" },
    pipelineUrl:
      "https://github.com/Azure/azure-rest-api-specs/actions/workflows/typespec-validation-all.yaml?query=event%3Aschedule",
  },
  {
    id: "gh-typespec-validation-next",
    name: "TypeSpec Validation All (typespec-next push)",
    source: "github",
    owner: "Azure",
    repo: "azure-rest-api-specs",
    workflow: "typespec-validation-all.yaml",
    params: { branch: "typespec-next", event: "push" },
    pipelineUrl:
      "https://github.com/Azure/azure-rest-api-specs/actions/workflows/typespec-validation-all.yaml?query=branch%3Atypespec-next+event%3Apush",
  },
  {
    id: "gh-typespec-validation-pr-nightly",
    name: "TypeSpec Validation All PR (Nightly - main)",
    source: "github",
    owner: "Azure",
    repo: "azure-rest-api-specs-pr",
    workflow: "typespec-validation-all.yaml",
    params: { event: "schedule" },
    pipelineUrl:
      "https://github.com/Azure/azure-rest-api-specs-pr/actions/workflows/typespec-validation-all.yaml?query=event%3Aschedule",
  },
  {
    id: "gh-typespec-validation-pr-next",
    name: "TypeSpec Validation All PR (typespec-next push)",
    source: "github",
    owner: "Azure",
    repo: "azure-rest-api-specs-pr",
    workflow: "typespec-validation-all.yaml",
    params: { branch: "typespec-next", event: "push" },
    pipelineUrl:
      "https://github.com/Azure/azure-rest-api-specs-pr/actions/workflows/typespec-validation-all.yaml?query=branch%3Atypespec-next+event%3Apush",
  },
  {
    id: "ado-6119",
    name: "Autorest Python Nightly",
    source: "ado",
    org: "azure-sdk",
    project: "public",
    definitionId: 6119,
    pipelineUrl: "https://dev.azure.com/azure-sdk/public/_build?definitionId=6119",
  },
  {
    id: "ado-6134",
    name: "Autorest TypeScript Nightly",
    source: "ado",
    org: "azure-sdk",
    project: "public",
    definitionId: 6134,
    pipelineUrl: "https://dev.azure.com/azure-sdk/public/_build?definitionId=6134",
  },
  {
    id: "ado-7123",
    name: "typespec-java nightly dev",
    source: "ado",
    org: "azure-sdk",
    project: "public",
    definitionId: 7123,
    pipelineUrl: "https://dev.azure.com/azure-sdk/public/_build?definitionId=7123",
  },
  {
    id: "ado-7506",
    name: "Autorest Go Nightly",
    source: "ado",
    org: "azure-sdk",
    project: "public",
    definitionId: 7506,
    pipelineUrl: "https://dev.azure.com/azure-sdk/public/_build?definitionId=7506",
  },
];
