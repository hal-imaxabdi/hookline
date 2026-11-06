import type { EmailAnalysisResult, PageAnalysisResult, TabState, UrlAnalysisResult } from "../shared/types";

export type CurrentAnalysis =
  | { kind: "email"; result: EmailAnalysisResult }
  | { kind: "page"; result: PageAnalysisResult }
  | { kind: "url"; result: UrlAnalysisResult };

export function currentAnalysis(state: TabState | null): CurrentAnalysis | null {
  if (!state) return null;
  if (state.mode === "email" && state.email) return { kind: "email", result: state.email };
  if (state.mode === "page" && state.page) return { kind: "page", result: state.page };
  if (state.mode === "url" && state.url) return { kind: "url", result: state.url };
  return null;
}
