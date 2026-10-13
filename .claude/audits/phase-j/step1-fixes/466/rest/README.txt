rest/ = emulator RTDB reads (owner auth) taken around each control. snap.sh is the helper that produced the stepN-*.txt files.
Caveat (my pipeline, not the app): during the run I piped snap.sh through `head`, which cut the trailing userDepts lines of
stepD-*, stepE-*, stepG-*, stepH-*, stepR-*. The dept A and dept C member lines (the discriminating data) are complete in every
file. step3-as-captured.txt is the verbatim terminal output for the step-3 reads. final-state.txt is a full, unpiped read at the end.
