/**
 * Photo lists for hotels and room types.
 * Body (multipart or JSON) may contain:
 *   keepPhotos  JSON array of existing photo URLs to keep (anything left out is removed)
 *   photoUrls   JSON array of image links to add (https://… or /uploads/…)
 * plus uploaded files. Returns the new list, or undefined when nothing about photos changed.
 */
const MAX_PHOTOS = 12;

const parseList = (value) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(/[\n,]/);
  }
};

const isImageUrl = (u) => typeof u === 'string' && (/^https:\/\/[^\s]+$/i.test(u.trim()) || /^\/uploads\/[\w.-]+$/.test(u.trim()));

const resolvePhotos = (existing = [], body = {}, files = []) => {
  const keep = parseList(body.keepPhotos);
  const urls = parseList(body.photoUrls);
  const uploaded = (files || []).map(f => `/uploads/${f.filename}`);
  if (keep === undefined && urls === undefined && uploaded.length === 0) return undefined;

  const kept = keep === undefined ? existing : existing.filter(p => keep.includes(p));
  const added = (urls || []).map(u => String(u).trim()).filter(isImageUrl);
  return [...new Set([...kept, ...added, ...uploaded])].slice(0, MAX_PHOTOS);
};

module.exports = { resolvePhotos, MAX_PHOTOS };
