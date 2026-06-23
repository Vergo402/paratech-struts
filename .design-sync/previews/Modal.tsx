import { Modal } from 'fieldshore-v4';

// Modal — the center-anchored STOP surface. Destructive/terminal confirms,
// >60vh forms, blocking alerts. Cancel is always the safe default. Rendered
// open with realistic FieldShore content so the card shows the open state.

const Btn = ({ children, primary, danger, cancel }: { children: string; primary?: boolean; danger?: boolean; cancel?: boolean }) => (
  <button
    type="button"
    {...(cancel ? { 'data-modal-cancel': '' } : {})}
    style={{
      font: 'var(--type-button)',
      padding: '12px 18px',
      borderRadius: 'var(--radius-control)',
      border: primary || danger ? 'none' : '1px solid var(--border)',
      background: danger ? 'var(--danger)' : primary ? 'var(--accent)' : 'transparent',
      color: danger || primary ? '#fff' : 'var(--text-primary)',
    }}
  >
    {children}
  </button>
);

export const Confirm = () => (
  <Modal
    open
    onClose={() => {}}
    title="End operation?"
    variant="confirm"
    footer={
      <>
        <Btn cancel>Keep open</Btn>
        <Btn primary>End operation</Btn>
      </>
    }
  >
    Surfside Champlain Towers will be archived. 14 shore points are still
    deployed — their equipment returns to inventory.
  </Modal>
);

export const Destructive = () => (
  <Modal
    open
    onClose={() => {}}
    title="Delete SP-14?"
    variant="destructive"
    footer={
      <>
        <Btn cancel>Cancel</Btn>
        <Btn danger>Delete shore point</Btn>
      </>
    }
  >
    SP-14 · T-Shore in Division 2 · Side A has a strut set. Deleting it returns
    the LongShore 812 to Engine 7 and cannot be undone.
  </Modal>
);

export const Alert = () => (
  <Modal
    open
    onClose={() => {}}
    title="Over capacity"
    variant="alert"
    footer={<Btn primary>Got it</Btn>}
  >
    The 47 3/8" opening exceeds rated capacity at the 4:1 safety factor. This
    strut cannot be deployed for this shore point.
  </Modal>
);
