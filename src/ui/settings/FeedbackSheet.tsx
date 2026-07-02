import { useEffect, useState } from 'react';
import { Sheet, Button, TextField } from '@ui/primitives';
import { InlineSegmented } from '@ui/picker';
import { useFeedback, type FeedbackApi, type FeedbackCategory } from '@ui/hooks';

// Feedback (#321 inc4d, 50-settings.md §7) — the v3 feedback modal re-homed to a Sheet
// (ADR-016). Category + message → the /feedback node via useFeedback. A brief success
// state confirms the send, then the sheet closes; a rejected write shows the reason.

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'idea', label: 'Idea' },
  { value: 'other', label: 'Other' },
];

export interface FeedbackSheetProps {
  open: boolean;
  onClose: () => void;
  /** Injectable for tests; defaults to the real hook. */
  api?: FeedbackApi;
}

export function FeedbackSheet({ open, onClose, api }: FeedbackSheetProps) {
  const hook = useFeedback();
  const { submit } = api ?? hook;
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (open) {
      setCategory('bug');
      setText('');
      setError(null);
      setSent(false);
      setSending(false);
    }
  }, [open]);

  const send = async () => {
    setError(null);
    setSending(true);
    const res = await submit({ category, text });
    setSending(false);
    if (res.ok) {
      setSent(true);
      setTimeout(onClose, 1200);
    } else {
      setError(res.reason);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Send feedback">
      {sent ? (
        <p style={{ font: 'var(--type-body-lg)', padding: 'var(--space-3) 0' }}>
          Thanks &mdash; your feedback was sent.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <InlineSegmented label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
          <TextField
            label="What's on your mind?"
            value={text}
            onChange={(v) => {
              setText(v);
              if (error) setError(null);
            }}
            multiline
            rows={4}
            maxLength={2000}
            placeholder="Describe the bug or idea…"
            helper="Sent with your app version and department so we can follow up."
            error={error ?? undefined}
          />
          <Button variant="primary" onPress={() => void send()} disabled={sending || !text.trim()} disabledReason="Enter a message">
            {sending ? 'Sending…' : 'Send feedback'}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
