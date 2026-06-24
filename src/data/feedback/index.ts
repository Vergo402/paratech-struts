// data/feedback — the feedback transport seam (#321 inc4d). ui/* reaches it only
// through ui/hooks (invariant 3).
export {
  feedbackService,
  createFeedbackService,
  type FeedbackServiceApi,
  type FeedbackInput,
  type FeedbackCategory,
  type FeedbackResult,
} from './feedbackService';
