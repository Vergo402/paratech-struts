import { feedbackService, type FeedbackInput, type FeedbackResult } from '@data/feedback';

// Re-export so ui/* consumers reach the type through @ui/hooks (invariant 3), not @data directly.
export type { FeedbackCategory } from '@data/feedback';

// Feedback behind the @ui/hooks seam (#321 inc4d). One method — submit the form to
// the /feedback node. Stable singleton method, so no useMemo needed.

export interface FeedbackApi {
  submit(input: FeedbackInput): Promise<FeedbackResult>;
}

export function useFeedback(): FeedbackApi {
  return { submit: feedbackService.submit };
}
