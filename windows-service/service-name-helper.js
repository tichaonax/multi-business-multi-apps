const config = require('./config');

/**
 * Return an ordered list of candidate service names to query via `sc`.
 * Mirrors electricity-tokens pattern where the internal id (no spaces)
 * is canonical and an alternate id without the dot before exe may be used.
 */
function getCandidateServiceNames() {
  const candidates = [];
  const internal = (config && config.name) ? String(config.name) : undefined;
  const display = (config && config.displayName) ? String(config.displayName) : internal;

  if (internal) {
    // Try the configured name as-is
    candidates.push(internal);

    // Try lowercase + .exe variant (what Windows actually registers)
    candidates.push(internal.toLowerCase() + '.exe');

    // Try lowercase without extension
    candidates.push(internal.toLowerCase());

    // If internal already ends with .exe, try variant without it
    if (/\.exe$/i.test(internal)) {
      candidates.push(internal.replace(/\.exe$/i, ''));
    }
  }

  // Finally fall back to display name (human-friendly, may contain spaces)
  if (display && !candidates.includes(display)) candidates.push(display);

  // Ensure unique and return
  return Array.from(new Set(candidates.filter(Boolean)));
}

module.exports = {
  getCandidateServiceNames,
};
