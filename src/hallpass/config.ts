export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
  storageBucket?: string;
}

export function firebasePublicConfig(): FirebasePublicConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    projectId,
    appId,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
  };
}

export function recaptchaSiteKey(): string {
  return process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim() ?? "";
}

export function hybridConfigured(): boolean {
  return firebasePublicConfig() !== null && recaptchaSiteKey().length > 0;
}

export interface HybridFlags {
  apiKey: boolean;
  projectId: boolean;
  appId: boolean;
  recaptcha: boolean;
  forcedRules: boolean;
}

export interface HybridSlot {
  id: keyof Pick<HybridFlags, "apiKey" | "projectId" | "appId" | "recaptcha">;
  label: string;
  present: boolean;
}

/** Which public slots Compile needs. Values are never returned. */
export function hybridFlags(env: {
  NEXT_PUBLIC_FIREBASE_API_KEY?: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
  NEXT_PUBLIC_FIREBASE_APP_ID?: string;
  NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY?: string;
  NEXT_PUBLIC_HALLPASS_INFERENCE?: string;
}): HybridFlags {
  return {
    apiKey: Boolean(env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim()),
    projectId: Boolean(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()),
    appId: Boolean(env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim()),
    recaptcha: Boolean(env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim()),
    forcedRules: env.NEXT_PUBLIC_HALLPASS_INFERENCE === "rules",
  };
}

export function hybridSlots(flags: HybridFlags): HybridSlot[] {
  return [
    { id: "apiKey", label: "Firebase API key", present: flags.apiKey },
    { id: "projectId", label: "Firebase project ID", present: flags.projectId },
    { id: "appId", label: "Firebase app ID", present: flags.appId },
    { id: "recaptcha", label: "reCAPTCHA Enterprise site key", present: flags.recaptcha },
  ];
}

export function hybridReady(flags: HybridFlags): boolean {
  return flags.apiKey && flags.projectId && flags.appId && flags.recaptcha && !flags.forcedRules;
}

/** CI and machines without Firebase stay on the deterministic engine. */
export function preferredMode(): "rules" | "hybrid" {
  if (process.env.NEXT_PUBLIC_HALLPASS_INFERENCE === "rules") return "rules";
  return hybridConfigured() ? "hybrid" : "rules";
}
