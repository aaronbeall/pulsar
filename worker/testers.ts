// Tester accounts: emails listed in the TESTER_EMAILS secret (comma- or space-separated).
// Their hosted AI calls are answered from the recorded replies (ai/replay.ts) instead of
// OpenAI, so testing on the live site costs nothing, and they can use the Account tools
// (dev/routes.ts) to reset usage or pretend to be subscribed. Kept out of wrangler.jsonc so
// personal emails stay out of the repo.

export function testerEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(/[\s,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isTester(env: Pick<Env, 'TESTER_EMAILS'>, email: string | null | undefined): boolean {
  if (!email) return false;
  return testerEmails(env.TESTER_EMAILS).has(email.trim().toLowerCase());
}
