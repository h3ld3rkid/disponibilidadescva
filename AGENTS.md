# AGENTS.md

## Rules

- Schedule export payloads and file names are built only in `src/components/schedule/UserScheduleUtils.ts` (`buildScheduleJsonPayload`, `scheduleJsonFileName`, `downloadBlob`); components call those so the single-user and batch (ZIP) JSON exports always produce identical files. Why: the JSON is read by an external program, so field names and file naming must never drift between the two export paths.
