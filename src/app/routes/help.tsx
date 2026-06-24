import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@ui/primitives';
// The canonical user manual (docs/USER-MANUAL.md) rendered in-app — one source of
// truth, imported as raw text so it can never drift from the committed doc. GFM
// gives the manual's tables + task lists. react-markdown renders no raw HTML by
// default, so the trusted doc is also XSS-inert.
import manual from '../../../docs/USER-MANUAL.md?raw';
import './help.css';

/**
 * HelpRoute — the in-app user guide, reachable from Settings → Help & Learning.
 * Read-only long-form: the manual rendered to themed prose. Surfaces the guide
 * that previously lived only in the repo.
 */
export function HelpRoute() {
  const navigate = useNavigate();
  return (
    <div className="fs-help">
      <div className="fs-help-head">
        <Button variant="tertiary" size="standard" onPress={() => navigate({ to: '/settings/account' })}>
          Back to Settings
        </Button>
        <h1 style={{ font: 'var(--type-headline-1)' }}>User guide</h1>
      </div>
      <article className="fs-help-doc">
        <Markdown remarkPlugins={[remarkGfm]}>{manual}</Markdown>
      </article>
    </div>
  );
}
