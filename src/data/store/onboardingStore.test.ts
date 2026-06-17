import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { createOnboardingStore, ONBOARDING_KEY, type OnboardingStoreApi } from './onboardingStore';
import { newId } from '@core/id';

describe('onboarding store (first-run progress, persisted)', () => {
  let db: FieldShoreDB;
  let name: string;
  let ob: OnboardingStoreApi;

  beforeEach(() => {
    name = `test-onboarding-${newId()}`;
    db = createDB(name);
    ob = createOnboardingStore(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('defaults to unseen when nothing is persisted', async () => {
    await ob.boot();
    expect(ob.store.getState()).toEqual({
      status: 'unseen',
      doneLessons: [],
      roleFocus: null,
      focusLesson: null,
    });
  });

  it('start arms the tour and survives a hydrate round-trip', async () => {
    await ob.boot();
    await ob.start();
    expect(ob.store.getState().status).toBe('active');

    const reopened = createDB(name);
    const next = createOnboardingStore(reopened);
    await next.boot();
    expect(next.store.getState().status).toBe('active');
    reopened.close();
  });

  it('start only fires from a clean slate (never re-greets a finished member)', async () => {
    await ob.boot();
    await ob.finish();
    await ob.start();
    expect(ob.store.getState().status).toBe('completed');

    await ob.dismiss();
    await ob.start();
    expect(ob.store.getState().status).toBe('dismissed');
  });

  it('markLessonDone records once and dedupes', async () => {
    await ob.boot();
    await ob.markLessonDone('welcome');
    await ob.markLessonDone('welcome');
    await ob.markLessonDone('quickfind');
    expect(ob.store.getState().doneLessons).toEqual(['welcome', 'quickfind']);
  });

  it('startLesson focuses a lesson; endLesson(true) records it and clears focus', async () => {
    await ob.boot();
    await ob.startLesson('quickfind');
    expect(ob.store.getState()).toMatchObject({ status: 'active', focusLesson: 'quickfind' });

    await ob.endLesson('quickfind', true);
    const s = ob.store.getState();
    expect(s.focusLesson).toBeNull();
    expect(s.doneLessons).toContain('quickfind');
  });

  it('endLesson(false) clears focus without recording completion', async () => {
    await ob.boot();
    await ob.startLesson('quickfind');
    await ob.endLesson('quickfind', false);
    const s = ob.store.getState();
    expect(s.focusLesson).toBeNull();
    expect(s.doneLessons).not.toContain('quickfind');
  });

  it('replayTour reactivates from a clean welcome (clears finished lessons)', async () => {
    await ob.boot();
    await ob.markLessonDone('welcome');
    await ob.markLessonDone('quickfind');
    await ob.finish();

    await ob.replayTour();
    expect(ob.store.getState()).toMatchObject({ status: 'active', doneLessons: [], focusLesson: null });
  });

  it('setRoleFocus persists across a hydrate round-trip', async () => {
    await ob.boot();
    await ob.setRoleFocus('command');
    expect(ob.store.getState().roleFocus).toBe('command');

    const reopened = createDB(name);
    const next = createOnboardingStore(reopened);
    await next.boot();
    expect(next.store.getState().roleFocus).toBe('command');
    reopened.close();
  });

  it('writes the full shape to its own meta row', async () => {
    await ob.boot();
    await ob.startLesson('quickfind');
    const row = await db.meta.get(ONBOARDING_KEY);
    expect(row).toBeDefined();
    expect(JSON.parse(row!.value)).toEqual({
      status: 'active',
      doneLessons: [],
      roleFocus: null,
      focusLesson: 'quickfind',
    });
  });

  it('degrades to the resting default on any unreadable or wrong-shape row (boot never throws)', async () => {
    const bad = [
      'not json {',
      'null',
      '42',
      '"active"',
      '[]',
      '{"status":"bogus"}',
      '{"doneLessons":"nope"}',
    ];
    for (const value of bad) {
      await db.meta.put({ key: ONBOARDING_KEY, value });
      await expect(ob.boot()).resolves.toBeUndefined();
      // Every bad row degrades to the resting default — re-offer the tour, never
      // dead-end boot and never resurrect a bogus status.
      expect(ob.store.getState()).toEqual({
        status: 'unseen',
        doneLessons: [],
        roleFocus: null,
        focusLesson: null,
      });
    }
  });
});
