# Field Conditions — Brainstorm Essay

## Executive Summary

Every competitor in the reference corpus designed for a seated user: dispatcher at a console, battalion chief in a command vehicle, records officer at a desk. FieldShore's design center is none of those people. It is the team officer standing at the edge of a partial collapse, one hand on a wall for balance, the other holding a phone with a wet screen and structural gloves, 4 minutes before the next PAR and 18 inches from a carpenter working with a reciprocating saw. That is the physical reality this essay addresses.

The design decisions that serve that person are not soft preferences about visual quality. They are hard constraints with physics behind them. A structural glove fingertip contacts the screen at roughly 18 to 22mm diameter, compared to 9mm for a bare fingertip. Apple's Human Interface Guidelines specify a 44pt touch target as the accessibility floor. At 44pt on a standard iOS display, a gloved thumb lands on the right target maybe 7 times in 10 on the first try. That miss rate is not acceptable when the operator is mid-operation and every missed tap costs radio time and concentration. The minimum for this product is 56pt for primary actions, with 60pt as the specific target for anything the operator touches during status transitions.

The same physics drives sunlight mode, haptics, the undo window duration, wet screen tolerance, and battery discipline. None of those are aesthetic choices. They are the answers to the question: what survives the void?

The v4 design must earn a verdict of "works" from the operator in structural gloves. Every friction point that would cause a firefighter to put the phone away and call it on the radio instead is a product failure, regardless of how it looks on a marketing screenshot. This essay puts numbers on each of those friction points and proposes a specific decision for each one that Phase D can copy verbatim into the tracking matrix.

---

## The Physical Baseline

The void is not a metaphor. Structural collapse incidents put the team officer in rubble, which means uneven footing, low overhead, no ambient light except flashlights and the screen, and a phone that has been dropped at least once. The scene is noisy: heavy equipment, saws, radio, victim vocalization when present. Hands are in structural gloves, the heavy canvas and leather kind that the fire service uses for exactly this environment. The turnout coat adds bulk to the forearms. The helmet's brim cuts the viewing angle to the screen from above.

None of this is exotic. It is a Level IV residential partial collapse on a Tuesday afternoon. A car came through the living room wall. The team officer has two shore points to set and 20 minutes of working time before the next PAR. The phone is the tool for recording measurements, selecting struts, updating status, and confirming what was deployed against the inventory.

The design question is not "what looks good on a phone." The question is "what works in the void."

Every competitor in the teardown corpus missed this. Tablet Command's drag and drop unit assignment is an elegant interaction for an iPad in a command vehicle. RapidSOS's dispatcher console packs six monitors of data onto one surface because the dispatcher is seated at a desk with a headset. IAMResponding's one-tap status response is optimized for a volunteer firefighter in a moving apparatus, pre-arrival, who needs a clean screen and a single big button. Each of those interactions is correct for its user. None of them are designed for a person who is mid-rescue in rubble, handling wet hardware, under time pressure.

FieldShore's team officer role is the only role in this product corpus with no precedent. That is the design opportunity and the design obligation.

## Tap Geometry

The 44pt Apple HIG minimum was derived for a bare adult fingertip. The contact diameter of a bare fingertip at normal typing pressure is approximately 9 to 10mm. A structural glove fingertip contacts a capacitive screen at 18 to 22mm diameter, depending on glove construction, because the capacitive response comes from the conductive area of the finger, and the glove adds lateral contact area before the fingertip itself. This is not a precision instrument.

At 44pt (approximately 15mm on a standard iOS display), the gloved fingertip contact zone is larger than the target. The first tap lands on the right target roughly 65 to 70 percent of the time. A 30 percent miss rate is not recoverable in the void. A missed tap either does nothing, requiring the operator to find the target again, or activates the wrong adjacent element. Either outcome costs 3 to 5 seconds per tap. At a PAR interval of 20 minutes with 4 to 6 status updates, that miss rate burns 45 to 90 seconds on tap correction alone.

The specific number for primary actions in this product is 56pt minimum target height, with the tappable area extending at least 4pt beyond the visible element edge via CSS touch target expansion. The visual element can be smaller than 56pt if the tap area is expanded. The 56pt tap area is the floor. Status transition buttons, the Add Shore Point action, and all FAB-style buttons are 60pt.

The visual language essay specifies 48pt primary button height and a 44pt floor, bumping to 56pt in sunlight mode. That is the right call for a product with a mixed indoor and outdoor user base. For FieldShore specifically, the bump to 56pt belongs in all themes, not only sunlight, because gloves are worn in every weather condition. The sunlight theme bumps to 60pt. The baseline theme sets 56pt. The 44pt floor from picker doctrine and the visual language essay is acceptable only for tertiary actions in detail views that are not accessed during an operation.

Row height in pickers and lists is 56pt per the picker doctrine. That is correct. The question is whether a 56pt row in a bottom sheet is actually reachable with one hand. That depends entirely on where in the sheet the row falls, which depends on where the bottom sheet lives on the screen. This is addressed in the thumb reach section.

## Thumb Reach: The Zone Map

One-handed operation is the operating assumption on the phone surface. The team officer's off hand is on the wall, on a strut, on a radio, or holding a flashlight. The app is designed for the right-hand dominant operator holding the phone in the right hand, with the right thumb as the only input device. Left-hand dominant operators are not excluded, but the primary reach zone is designed for the right thumb.

A standard iPhone (375pt to 390pt wide) held in the right hand in portrait mode gives the right thumb a comfortable reach zone that covers roughly the bottom 40 percent of the screen and the right two-thirds of any row. The top third of the screen and the left edge above the midpoint are difficult to reach one-handed without shifting the grip. A grip shift takes roughly 2 seconds and introduces a drop risk per shift.

Every primary action in the operations view belongs in the bottom 40 percent of the screen. The FAB that adds a shore point is bottom right, 20pt above the safe area. That positioning from the visual language essay is correct and must not move. The status transition buttons on shore point cards are the harder problem: a list of 6 shore point cards pushes the primary action on each card toward the center and top of the list as the list grows, and the operator cannot reach the top card's status button one-handed without a grip shift.

The solution is to make the card's entire left border zone a secondary tap affordance for the primary action on that card. The visual language essay specifies a 4pt status color stripe on the left edge of shore point cards. That stripe is already in the thumb's natural wrapping position when the operator holds the phone with a right-hand grip. Extending the tap area of that stripe to the full card height, 16pt wide from the left edge, gives the operator a reach path to any card in the list without changing the grip. Tapping the status stripe opens the status transition directly, equivalent to tapping the explicit status button on the card.

This is not a new pattern. The principle is the same as Apple Maps using the bottom sheet drag handle as both a visual affordance and a tap target for the primary action: expose the primary action at the reach zone, not only at the visual location.

## The Sunlight Problem

The visual language essay specifies the sunlight theme in full: black text on white, 2pt borders, type weight bumped one step, status badges growing to full-width banners, touch targets at 56pt minimum. Those are the correct decisions. This essay adds the WHY behind each choice and the triggering logic the visual language essay deferred.

The screen backlight ceiling on a modern iPhone is approximately 1,000 to 2,000 nits peak brightness in outdoor mode. Direct midday sun is 100,000 lux at the surface. The ratio is roughly 1:100. At that ratio, a dark background with light text produces reflective contrast that reads as a medium gray surface with low contrast text. The dark theme survives in shade. It does not survive in direct sun on a wet screen at maximum brightness.

The fix is not to boost the dark theme further. The fix is the separately authored sunlight theme. That theme is a real authored set of tokens, not overrides on dark or light. The visual language essay makes this call correctly and this essay does not relitigate it.

The triggering logic: sunlight mode activates on two paths. The first is a manual toggle in Settings that persists for the session. The second is automatic via the `AmbientLightSensor` API where available (Chrome on Android at time of writing) or the `illuminance` property on `DeviceMotionEvent` on iOS WKWebView. The automatic trigger fires when ambient illuminance exceeds 10,000 lux and the operator has not manually overridden the theme. Manual override takes priority and suppresses the automatic trigger.

The border jump from 1pt to 2pt in sunlight mode is not decorative. At 1pt on a sunlit white surface, card boundaries become invisible as glare washes the page. At 2pt, the border has enough visual mass to survive mild glare. The 2pt offset card shadow at 8% opacity exists for the same reason: without it, white cards on a white background are invisible as distinct objects.

The type weight bump from 400 to 500 on body text is about stroke width survival. At noon in direct sun, thin strokes in a word disappear. Regular weight at 14pt becomes a ghosted form. Medium weight holds. This is a physical optical effect.

The status badge growing to a full-width banner is the most operationally significant change in sunlight mode. In the standard theme, a 22pt badge in the upper right of a shore point card is readable at normal contrast. In direct sun, that badge is approximately 7mm tall on the screen with text at 11pt. The glare reduces effective contrast to 40 to 60 percent. The full-width banner at the top of the card is 36pt tall with text at 16pt. The operator reads it in a glance, no squinting required.

WCAG AAA contrast is 7:1. The sunlight theme targets 7:1 minimum for all text. Any status token pair that does not reach 7:1 on white communicates status through the label word only, not color, in sunlight mode. The status badge says "Cutting Station" or "Runner" and that word is the signal, not the color behind it.

## Wet Screen and Ghost Taps

A wet screen on a capacitive touch display behaves like a large capacitive contact covering parts of the surface. A single water drop can register as a tap. Multiple drops can freeze the touch sensor entirely. This is not a rare edge case at a collapse scene: rain, sweat under a helmet, a dropped water bottle, mortar dust that absorbs humidity. The screen will be wet.

There is no software solution to water contamination at the physics layer. What the app can do is reduce the consequence of ghost touches through spacing and recovery.

Spacing means the gap between adjacent tap targets is never less than 8pt of dead zone. At 56pt tap targets with 8pt gaps, the minimum center-to-center distance is 64pt. A water drop large enough to span that gap would be roughly 21mm in diameter, which is a serious water contact, not ambient wetness. Standard rain on a screen creates droplets of 2 to 5mm that produce a false tap at a specific point but do not span two adjacent 64pt-spaced targets.

Recovery means every status-changing action goes through the undo toast per Principle 6. A ghost tap that triggers a status transition produces a toast. The operator feels the haptic (see next section), looks at the screen, sees the toast, and taps Undo. This is the designed recovery path. The undo window is the wet screen safety net.

## The 5 Second Undo Window in the Void

The visual language essay specifies 5 seconds for the undo window, modeled on Apple Mail's "Undo Send." In an office, by a seated user looking at the screen, 5 seconds is a measured design choice.

In the void, 5 seconds is not enough.

The team officer is looking at the collapse zone when a status transition happens. The toast appears at the bottom of the screen. The operator is not looking at the bottom of the screen. The toast starts its countdown while the operator's eyes are on the rubble. By the time the operator looks back at the phone, 3 to 5 seconds may already have elapsed. A missed undo on a status transition means a shore point shows as Strut Placed when the strut has not been placed, or Cutting Station when the wood is not cut. Those are not cosmetic errors. They affect the IC's view of the operation and can drive incorrect resource decisions.

The specific recommendation is 8 seconds for the undo window on all status transitions during an active operation. The toast progress line runs for 8 seconds from right to left. Outside an active operation, in setup or review, 5 seconds is sufficient. The undo window duration is contextual.

The argument against 8 seconds: if a second action fires during the window, the first toast commits with no undo, and the second toast appears. At 8 seconds, the overlap risk is higher than at 5 seconds. That is a real tradeoff. The resolution is to keep the maximum one-toast rule from the visual language essay and accept that rapid successive transitions will sometimes lose the first undo opportunity. Accidental rapid transitions are exactly the error the undo window protects against. The operator who fires two transitions in 8 seconds is doing it intentionally.

## Haptics as a Primary Signal Channel

In the void, the screen is often not visible. The operator is looking at the collapse zone, the strut being set, the firefighter with the saw. The phone is in hand, a tap is made, and the operator does not look at the screen to confirm it registered. The only confirmation channel that does not require looking at the screen is haptic feedback.

The iOS Haptics API supports three weights: light, medium, and heavy. Android supports duration patterns via the Vibration API. Both are accessible from a PWA in WKWebView on iOS 13+, with the constraint that haptics require a user gesture to trigger (they are not programmable on a timer).

Every status transition produces a medium impact haptic on confirmation. The distinction between "tap registered" and "action succeeded" matters: the tap registration haptic (light, fires on touch start) tells the operator the screen saw the touch. The action success haptic (medium, fires when the status change is committed to local state) tells the operator the action went through. The operator feels both in sequence and knows the action succeeded without looking at the screen.

The undo toast appearing produces a light notification haptic. This is the "something happened, check the screen" signal. It is separated from the action success haptic by the toast animation duration (200ms), so they are distinguishable by feel.

A ghost tap that produces an unintended status transition still produces the medium action success haptic. The operator feels it, looks at the screen, sees the undo toast, and recovers. The haptic makes the undo window useful when the screen is not in the operator's field of view.

## Audio Feedback

Structure fires and collapse scenes are loud. Saws, compressors, heavy equipment, radio, voices. The phone speaker on a device held at arm's length or in a pocket is not audible in most collapse scenes. Audio feedback from the app is not a reliable primary channel.

FieldShore does not implement audio feedback in v4. This is consistent with Principle 3 (calm in chaos) and Principle 10 (respect the radio). The haptic channel handles what audio would handle, without adding to the acoustic noise at the scene.

Voice input is a different question from audio output. The team officer in the void cannot type a measurement with structural gloves on. The standard keyboard is inaccessible with a thick glove. The practical paths for measurement input in the field are: a custom large-key numeric keypad designed for gloved operation, or dictation via the system voice input.

For v4, the primary path is a custom numeric keypad at the measurement input step: keys at 56pt minimum height and width, 3-column layout, no letters, centered on the screen. The system dictation button is a secondary affordance in the keyboard toolbar for environments with manageable ambient noise. Voice input as a first-class entry mode belongs in v4.5 once the product has field feedback on how often operators actually use it and in what noise conditions it fails.

## Battery Discipline

A structural collapse incident runs 4 to 8 hours. The team officer's phone is in active use throughout: screen on, GPS available, Firebase sync attempting, service worker processing. A modern iPhone at full brightness with active network use runs approximately 3 to 4 hours before the battery warning fires. Outdoor mode adds additional drain.

FieldShore cannot control system brightness. It can control its own behavior. The specific levers are screen on time, background processing frequency, and Firebase listener lifecycle.

Screen on time: the app should request `navigator.wakeLock.request('screen')` when an operation is active to prevent system auto lock from firing between status updates. Auto lock forces the operator through a biometric or passcode step on every return to the app, adding a tap and a second per interaction. The power cost of a wake lock is approximately 20 to 30 percent additional drain over the screen's baseline draw. That is the correct tradeoff for an active operation. The wake lock releases when the app goes to background.

Firebase listeners: detach on background transition, reattach on foreground, per the teardown listener pattern established in v3.6.0. Detaching eliminates WebSocket keep-alive drain in background. The service worker background sync interval for queued writes is 60 seconds maximum in background, not a polling loop.

The battery constraint drives one interface decision that is not about power directly: the pocket lock (addressed next) prevents unnecessary screen activity when the phone is pocketed between status updates, which reduces the effective duty cycle and extends the available session time.

## Phone in Pocket vs. Held in Hand

The team officer's phone alternates between two states: held in hand for active input and in the turnout coat pocket between actions. The pocket is not a safe mode. The phone screen is live, the wake lock may be active, and the turnout pocket contains hardware (tools, radio, SCBA controls) that can make capacitive contact against the screen.

Ghost actions from pocket contact are a real v3 failure mode. The solution is a pocket lock: a large-area button in the operations header labeled "Lock for Pocket" that activates a full-screen overlay. The overlay requires a deliberate swipe-up gesture from a bottom handle to dismiss. A pocket cannot replicate that gesture. The overlay shows the active shore point count and operation name in the header, so the operator can read the screen at a glance without dismissing the lock.

The pocket lock activates automatically if the proximity sensor reports covered for more than 5 seconds while an operation is active. The iOS WKWebView has access to proximity events via `DeviceProximityEvent` on iOS 15+. Android WebView has native proximity sensor access. The automatic trigger is a progressive enhancement: if the sensor is not available, the operator uses the manual button. The lock dismisses on the swipe gesture or when the proximity sensor clears.

## Dropped Phone Resilience

A phone dropped from 5 feet onto concrete produces a shock that can trigger an unintended screen tap on impact. If the screen faces down, the touch sensor may activate against the concrete surface and fire an action. If the screen faces up, no touch fires but the scroll position in any long list may reset.

The architectural guarantee is the persistence layer: every state mutation in the operations view writes to IndexedDB synchronously before the UI updates. When the operator picks up the phone, unlocks it, and the PWA resumes, the UI restores from the last persisted state. The architecture essay recommends IndexedDB via Dexie, and that choice serves this requirement directly.

The scenario to test explicitly: operator taps a status button, the transition starts, the phone drops before the toast appears. The IndexedDB write is synchronous and completes before the physics of the drop interrupt the CPU. When the operator picks up the phone, the transition is committed and the undo window has expired. The operator can manually revert via the status picker on the card. No undo is guaranteed across a hardware interruption, and that is the correct behavior. The action was intentional; it completed.

## Cross Surface: Phone as Firehose, Tablet as Abstraction

The phone is the firehose of field input. Every measurement comes in from a team officer on a phone. Every strut deployment is logged on a phone. Every status transition is made on a phone. The IC's tablet is the abstraction: same operations view, two-column layout where the shore point list is the left pane and the selected card's detail is always visible in the right pane.

What the tablet does not do is receive raw input. The IC does not type measurements. The IC watches shore point status move through the lifecycle and dispatches resources based on what phone operators report. The tablet's interaction model is read-heavy with occasional write: reassigning a resource to a different shore point, updating the operation name, pushing a priority note to the cutting queue.

The cross-surface story for a status transition: the team officer taps "Strut Placed" on the phone. The write goes to IndexedDB, the toast appears, Firebase sync queues the write. The IC's tablet, connected via the same Firebase listener, receives the state update within 2 to 4 seconds on a working connection. The IC sees the shore point card change state without any action on their end.

What the tablet needs that the phone does not: a status summary bar above the shore point list showing counts by status. "3 Cutting Station / 2 Runner / 1 Secured" gives the IC a triage view without scrolling through 12 cards to count. On the phone, that summary is unnecessary because the team officer is tracking one or two shore points personally. On the tablet, it is the IC's primary situational awareness panel.

The one tablet-primary interaction is cutting queue reorder. The IC drags shore point cards in the cutting queue to set the carpenter's priority sequence. A team officer can see the cutting queue on a phone but cannot reorder it. Reorder is a CP action. The phone shows the current queue order in a read-only list. The tablet shows the queue with drag handles.

---

## Recommendations

1. Set the minimum tap target for all primary actions on the phone surface to **56pt height and width**, with the tappable area extending at least 4pt beyond the visible element edge via CSS touch target expansion. This applies in all themes, not only sunlight.

2. Set the minimum tap target for status transition buttons to **60pt height**, regardless of visible button size.

3. Expose the **status color stripe on the left edge of each shore point card as a secondary tap affordance** for the card's primary status action. The tappable zone is the full height of the card, 16pt wide from the left edge. This gives a right-thumb reach path to any card in the list without a grip shift.

4. Extend the undo window to **8 seconds during an active operation**. Outside an active operation, 5 seconds is sufficient. The toast progress line runs for the context-appropriate duration.

5. Trigger sunlight mode automatically when ambient illuminance exceeds **10,000 lux** via the `AmbientLightSensor` API or `DeviceMotionEvent.illuminance`. Manual toggle in Settings takes priority and suppresses automatic trigger.

6. Set minimum text contrast in sunlight mode to **7:1 (WCAG AAA)** for all text elements. Any status token pair that does not reach 7:1 on white communicates status through label text only.

7. Set the minimum gap between adjacent tap targets to **8pt dead zone**, making the minimum center-to-center distance for adjacent primary actions 64pt (56pt target plus 8pt gap).

8. Fire a **light haptic on touch start** and a **medium impact haptic on state commit to IndexedDB** for every status transition. Fire a **light notification haptic when the undo toast appears**.

9. Do not implement audio feedback in v4. The haptic channel is the primary non-visual confirmation path. Audio feedback is a Settings opt-in for v4.5 only, defaulting to off.

10. Build a **custom numeric keypad for measurement input**: keys at 56pt × 56pt minimum, 3-column layout, centered on screen. System dictation is a secondary affordance in the keyboard toolbar. Full voice input mode deferred to v4.5.

11. Request **`navigator.wakeLock.request('screen')`** when an operation is active. Release on background transition. Document the 20 to 30 percent additional battery draw in the performance spec.

12. Set the maximum Firebase background sync interval to **60 seconds**. Detach real-time listeners on background transition and reattach on foreground per the v3.6.0 teardown listener pattern.

13. Implement a **pocket lock**: a manual "Lock for Pocket" button in the operations header plus automatic activation via proximity sensor after 5 continuous seconds covered. Dismiss via swipe-up from a bottom handle. Overlay shows operation name and shore point count only.

14. Every state mutation in the operations view **writes to IndexedDB synchronously before the UI updates**. A dropped phone produces zero data loss on resume.

15. Surface a **status summary bar on the tablet operations view** showing counts per active status above the shore point list. Phone does not show this bar. Tablet always shows it.

16. Make **cutting queue reorder a CP-only action**: drag handles visible only on the tablet. Phone shows the cutting queue in read-only order.

17. Set the minimum row height in the operations view list and all pickers accessed during an active operation to **56pt in all themes**. The 44pt floor applies only to tertiary disclosure contexts not accessed mid-operation.

18. In sunlight mode, enforce **2pt minimum borders** on all cards and a **2pt offset card shadow at 8% opacity**. Both are required for edge visibility in direct sun and are not optional visual polish.
