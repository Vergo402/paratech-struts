import { describe, expect, it } from 'vitest';
import type { DeployedComponent } from '@core/schema';
import { pieceIdentity, plateName, sameExtensions } from './pieceIdentity';

const strut = (model?: string): DeployedComponent => ({ role: 'strut', model, source: 'Rescue 2' });
const ext = (length: number): DeployedComponent => ({ role: 'extension', length, source: 'Rescue 2' });
const plate = (plateId?: string): DeployedComponent => ({ role: 'top-plate', plateId, source: 'Rescue 2' });

describe('pieceIdentity', () => {
  it('names a strut by its model, falling back to "Strut"', () => {
    expect(pieceIdentity(strut('LS 406'))).toBe('LS 406');
    expect(pieceIdentity(strut())).toBe('Strut');
  });

  it('names an extension by its length in inches', () => {
    expect(pieceIdentity(ext(12))).toBe('12″ extension');
  });

  it('names a plate by its catalog name, falling back to "Base plate"', () => {
    expect(pieceIdentity(plate('not-a-real-id'))).toBe('Base plate');
    // A real catalog id resolves to its name (whatever the catalog calls it).
    expect(plateName('not-a-real-id')).toBe('Base plate');
  });
});

describe('sameExtensions', () => {
  it('is order-independent and length-sensitive', () => {
    expect(sameExtensions([12, 6], [6, 12])).toBe(true);
    expect(sameExtensions([], [])).toBe(true);
    expect(sameExtensions([12], [12, 6])).toBe(false);
    expect(sameExtensions([12, 12], [12, 6])).toBe(false);
  });
});
