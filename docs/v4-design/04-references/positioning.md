# Where FieldShore Fits

## Why this doc exists

When a design call starts pulling the app toward something one of the other vendors already does, come back here. This is the gut check on whether we are drifting somewhere we shouldn't be.

The six teardowns in this folder each look at one competitor's screens. This one looks across all of them and says where we sit.

## What the other apps actually do

**Tablet Command** runs on the chief's iPad at the command post. Drag a unit onto an assignment, start a PAR timer, log a benchmark, email the after action off the truck. It does the fireground command piece well. There is no shoring in it, no struts, no load tables, no measurement workflow. If a department wants to rename "Group" to "Squad," it can, which is the right call for a tool that has to work for everybody from a city engine company to a small volunteer department. What it does not carry is the safety math, because that is not what it is for.

**First Due** is a pile of modules a department buys piece by piece. Records, scheduling, training, preplans, ePCR, a command module if you want it. Each piece is wide and shallow. The preplans showing up on a responding firefighter's phone is genuinely good. None of the modules know anything about a shore.

**RedNMX** is the paperwork side of the firehouse. NFIRS, NERIS, LOSAP, pension tracking, fifty plus modules built around federal record schemas. It looks like Windows because it basically is. For a volunteer department that lives and dies on NFIRS and LOSAP, it is hard to beat. The on scene work is not in the product.

**IAMResponding** tells the station who is coming to the call. You tap "responding," it shows up on the bay wall display, and then the app gets out of the way. That is the whole job. The moment you get off the rig it stops mattering, which is exactly where we start mattering.

**RapidSOS** sits between the 911 call and the unit arriving. We study how it looks more than what it does. The dispatcher console packs six monitors worth of information into one screen and gets away with it because it knows the dispatcher is sitting down with a headset on. The responder app on the way to the call is calm and stripped down for the same reason. That split, dense for the seated user and quiet for the moving one, is what we want across our four screens.

**Fire Rescue Systems** is CAD, MDT, roster, LOSAP, and NFIRS bundled for small combination departments. Fifteen plus modules. The phone app reviews badly, partly because it stops working when the connection drops, which for our world is not a small thing. No on scene tactical layer.

## The hole in the middle

Two patterns across all six. The records vendors stay in records. The tactical vendors stay general. Nobody ships a tool that is both on the scene with you and serious about the safety doctrine that governs what you are doing there.

That is the hole we sit in. Structural collapse, on the scene, with the actual USACE shore types, the actual Paratech load tables, the actual NIMS org structure, encoded the way they are written down and not whatever a department's templating screen produced.

The reason nobody else has filled it is reasonable. Most incidents look enough alike that a general tactical layer covers them. A car fire, a working house fire, a vehicle accident, a water rescue. Unit assignments and a status board and you are mostly covered. Structural collapse does not work that way. Every measurement is different, every angle is different, multiple work areas are feeding numbers in at once, and the platform that runs a working house fire has almost none of what you need. Wildland is the only other widespread incident type with this kind of expanding complexity, and it pulled dedicated tooling decades ago because the scale was obvious. Collapse has not yet, which is why we are doing it.

## What we are

The everyday case is Level IV and Level V. A car into a residence. A small commercial parapet that came down. A residential partial collapse. Around ninety nine percent of what most departments will ever see in their career. The app has to keep working as the call grows, through Level III and Level II and all the way up to a federal Level I like Surfside running task forces around the clock. The same screen runs on a team officer's phone with two shore points and on a section chief's TV with two hundred fifty. If it breaks at either end that is a problem we own.

The team officer is who we design for first. The chief is the second screen. The dispatcher and the station display are after that. Everything starts with the gloved hand in the rubble with a measurement in front of it.

Doctrine is taken straight from the source. USACE shore types as USACE writes them. Paratech load tables verbatim from the manufacturer's published tables. NIMS roles using the words NIMS uses. We do not let a department template its way around any of that, because the safety call is not configurable.

The app is local first. It starts on the phone, syncs when it can, and never assumes the connection is there. Every other product in this corpus starts the other way around and degrades when the cell drops. That is the wrong contract for our world.

## What we are not

Not a fifty module suite. We are not adding scheduling or training or prevention or LOSAP or NFIRS to this app. That is what the other vendors are for.

Not a radio replacement. No chat, no push during active operations, no "Evac Now" button. Life safety communication stays on the radio where it belongs. That call is in Principle 10.

Not all hazard. We do not stretch sideways into wildland or hazmat or technical rescue or generic incident management. That is the temptation that put Tablet Command at moderate depth across a lot of things instead of deep at one. We stay vertical.

Not configurable doctrine. A department does not get to template its way out of a load table.

Not built for the office. The records officer and the chief are not the design center. They get screens, but not first.

## The one line

> FieldShore is the structural collapse tool for the rescuers inside the building and the technicians in the street, not the records officer at the desk.

That is the sentence to put in front of any design call that starts pulling somewhere else.

## Where to watch for drift

**Drifting toward Tablet Command.** If a design cycle starts polishing the chief's tablet before the team officer's phone, we are sliding into the general iPad command space. The phone is always the first screen designed for any workflow. The tablet comes second.

**Drifting toward First Due or Fire Rescue Systems.** If scope creeps into NFIRS export, scheduling, LOSAP, or mutual aid messaging, we are sliding into records suite territory. Every scope add gets tested against whether it makes the rubble role better. If it does not, it does not land here.

**Drifting toward RedNMX visually.** The v3 surface still looks like records software, with system fonts and gray cards. The architecture is tactical but the skin is not. Phase E ships a real type ramp, a controlled palette, an outdoor readable mode, and a consistent design system across all four screens before any new feature lands.

**Drifting toward IAMResponding or RapidSOS on notifications.** Every reference app pushes notifications. The pull to add them is constant. Principle 10 says no. No PR adds a push notification without an ADR that explicitly cites and overrides it. The default is no.

## What was intentional, what was lucky, what needs fixing

Intentional. The rubble role as the design center. The four screens sized to the role and not the device. The local first contract. The calm visual register. The decision to leave life safety communication on the radio.

Lucky but worth keeping. The free PWA economic posture. It started as an early version limitation but it lines up with how IAMResponding and RapidSOS get into volunteer departments, which is the audience that needs the tool the most.

Lucky and worth fixing. The current look. System fonts, default browser controls, gray cards. The product holds the tactical position but the screen looks like records software. That gap between what we are and what we look like is the biggest thing v4 closes.
