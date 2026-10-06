/**
 * Applies a unified diff patch to an array of lines.
 * Ported from the original spec evolution viewer's applySynapticPatch.
 */
export function applySynapticPatch(lines: string[], patch: string): string[] {
  const out = lines.slice();
  const patchLines = patch.split("\n");
  let offset = 0;

  for (let i = 0; i < patchLines.length; i++) {
    const line = patchLines[i];
    if (line.startsWith("@@")) {
      const m = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (m) {
        const os = parseInt(m[1]);
        const oc = parseInt(m[2] || "1");
        // A hunk that removes nothing ("-a,0") inserts *after* old line a, so
        // "-0,0" (file creation) inserts at the very start.
        const startPos = (oc === 0 ? os : os - 1) + offset;
        const newSeg: string[] = [];
        i++;
        while (
          i < patchLines.length &&
          patchLines[i] !== undefined &&
          !patchLines[i].startsWith("@@")
        ) {
          const row = patchLines[i];
          // Not hunk lines: the empty string left by the patch's trailing
          // newline, and "\ No newline at end of file" markers. Treating them
          // as context used to insert a stray blank line per patch, which
          // drifted every later hunk.
          if ((row === "" && i === patchLines.length - 1) || row.startsWith("\\")) {
            i++;
            continue;
          }
          if (row.startsWith("+")) newSeg.push(row.slice(1));
          else if (!row.startsWith("-")) newSeg.push(row.slice(1));
          i++;
        }
        i--;

        const CHUNK_SIZE = 5000;
        if (newSeg.length > CHUNK_SIZE) {
          out.splice(startPos, oc);
          for (let j = 0; j < newSeg.length; j += CHUNK_SIZE) {
            const chunk = newSeg.slice(j, j + CHUNK_SIZE);
            out.splice(startPos + j, 0, ...chunk);
          }
        } else {
          out.splice(startPos, oc, ...newSeg);
        }

        offset += parseInt(m[4] || "1") - oc;
      }
    }
  }
  return out;
}

/**
 * Strips markdown formatting from a line of text for comparison purposes.
 */
export function stripMd(text: string): string {
  return text
    .replace(/^#+\s+/, "")
    .replace(/^[*+-]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/^>\s+/, "")
    .replace(/[*_~`]/g, "")
    .trim();
}
