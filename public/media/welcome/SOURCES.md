# Welcome-page footage provenance (#442)

`ops-loop.mp4` (and `poster.jpg`, a frame from it) is cut from three U.S.
government works — public domain, DVIDS-hosted (usage restrictions:
https://www.dvidshub.net/about/copyright — no implied DoD endorsement):

| Segments | Source |
|---|---|
| Collapsed-building wides, dog handler, pancaked-slab traverse, radio pair, rebar-pile closer | [DVIDS 1013363](https://www.dvidshub.net/video/1013363/) — "Urban Search and Rescue teams continue the search for survivors", **real earthquake response**, La Guaira, Venezuela, July 2026 (U.S. Dept. of State) |
| Fire-helmet crews working the pile | [DVIDS 77463](https://www.dvidshub.net/video/77463/) — "Los Angeles Fire Rescue Team Clear Rubble in Haiti", **real earthquake response**, Port-au-Prince, January 2010 |
| Lumber saw station (kept per Alex) | [DVIDS 1006320](https://www.dvidshub.net/video/1006320/) — "Search and Rescue Training at Guardian Response 26", Muscatatuck UTC, May 2026 |

Real-incident footage cut around any visible casualties — rescuers, dogs, and
the pile only. (DVIDS 77479 was downloaded and reviewed but excluded: visible
casualties.) No hazmat, no rope-rescue scenes (recut 2026-07-11 per Alex).
Muted, 1280×720, H.264 CRF 33, six segments with 0.75 s crossfades, ~36 s
loop. Rebuild recipe in issue #442's session (ffmpeg xfade chain over the
source files).
