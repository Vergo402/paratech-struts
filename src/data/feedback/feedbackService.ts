import { rtdb, ref, push, serverTimestamp } from '../sync/firebase';
import { sessionStore, type SessionStoreApi } from '../store/session';
import { APP_VERSION } from '@core/version';

// Feedback transport (#321 inc4d) — a thin write to the root-level /feedback node
// (v3-preserved rule: auth != null, requires category/text/timestamp; extra fields
// allowed). Mirrors departmentService: a singleton bound to the session store, one
// public method behind the @ui/hooks seam. The /feedback rule needs auth, so a guest
// can't write — a rejected write maps to a friendly "sign in" reason.

export type FeedbackCategory = 'bug' | 'idea' | 'other';

export interface FeedbackInput {
  category: FeedbackCategory;
  text: string;
}

export type FeedbackResult = { ok: true } | { ok: false; reason: string };

export interface FeedbackServiceApi {
  submit(input: FeedbackInput): Promise<FeedbackResult>;
}

export function createFeedbackService(deps: { session: () => SessionStoreApi }): FeedbackServiceApi {
  return {
    async submit({ category, text }) {
      const trimmed = text.trim();
      if (!trimmed) return { ok: false, reason: 'Enter a message before sending.' };
      // Mirror the #424 rule cap (5000) so an over-long message gets a length
      // message, not the misleading permission fallback (the UI caps at 2000;
      // this guards non-UI callers).
      if (trimmed.length > 5000) return { ok: false, reason: 'Message is too long (max 5000 characters).' };
      const s = deps.session().store.getState();
      if (s.identity.kind !== 'member') {
        return { ok: false, reason: 'Sign in to send feedback.' };
      }
      try {
        await push(ref(rtdb, 'feedback'), {
          category,
          text: trimmed,
          timestamp: serverTimestamp(),
          deptId: s.departmentId ?? null,
          deptName: s.departmentName ?? null,
          appVersion: APP_VERSION,
          uid: s.identity.accountId,
        });
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/permission_denied/i.test(msg)) return { ok: false, reason: 'Sign in to send feedback.' };
        return { ok: false, reason: 'Could not send feedback. Check your connection and try again.' };
      }
    },
  };
}

/** The app's singleton feedback service, bound to the singleton session store. */
export const feedbackService = createFeedbackService({ session: () => sessionStore });
