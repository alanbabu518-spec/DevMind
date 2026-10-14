export const ANALYSIS_QUEUE_NAME = "devmind-code-analysis";

export interface CodeAnalysisJobData {
  userId: string;
  language: "python";
  source_code: string;
  filename: string;
}
