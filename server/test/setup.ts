import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Each test file runs in its own DB directory so the suite can't pollute
// the dev game.db, and tests don't see each other's leftover rows.
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "octo-test-"));
