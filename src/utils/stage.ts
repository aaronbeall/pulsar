/**
 * Which copy of Pulsar this build is: production, staging (staging.pulsarworkouts.app) or a
 * PR preview. Set at build time by .github/workflows/cloudflare.yml; production and local
 * builds set neither.
 */
export function stageLabel(stage: string | undefined, previewPr: string | undefined): string | null {
  if (previewPr) return `PR #${previewPr}`;
  if (stage === 'staging') return 'Staging';
  return null;
}

/** The badge shown in the app's header on staging and PR previews; null in production. */
export const STAGE_LABEL = stageLabel(import.meta.env.VITE_STAGE, import.meta.env.VITE_PREVIEW_PR);
