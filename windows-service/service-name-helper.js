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

  if (internal) candidates.push(internal);

  // If internal ends with .exe, also try the variant used by winsw id where the dot is removed
  // Example: 'MultiBusinessSyncService' -> 'multibusinesssyncservice.exe'
  if (internal && /\.exe$/i.test(internal)) {
    const alt = internal.replace(/\.exe$/i, 'exe.exe');
    if (alt !== internal) candidates.push(alt);
  }

  // Also try the internal without extension
  if (internal) candidates.push(internal.replace(/\.exe$/i, ''));

  // Finally fall back to display name (human-friendly, may contain spaces)
  if (display && !candidates.includes(display)) candidates.push(display);

  // Ensure unique and return
  return Array.from(new Set(candidates.filter(Boolean)));
}

module.exports = {
  getCandidateServiceNames,
};
