import { FeedbackSheet } from 'fieldshore-v4';

const noop = () => {};
// ponytail: injectable api prop avoids needing the real Firebase hook
const mockApi = { submit: async () => ({ ok: true as const }) };

export function Open() {
  return (
    <div data-theme="light" style={{ minHeight: 400, position: 'relative', overflow: 'hidden' }}>
      <FeedbackSheet open={true} onClose={noop} api={mockApi} />
    </div>
  );
}
