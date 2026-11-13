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

/** CI and machines without Firebase stay on the deterministic engine. */
export function preferredMode(): "rules" | "hybrid" {
  if (process.env.NEXT_PUBLIC_HALLPASS_INFERENCE === "rules") return "rules";
  return hybridConfigured() ? "hybrid" : "rules";
}
