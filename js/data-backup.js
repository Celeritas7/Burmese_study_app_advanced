// Phase UI-1: an explicitly device-local, read-only snapshot.
// Do not add Supabase credentials, shared Study/SRS tables, or auth session keys here.
export const DEVICE_BACKUP_FIELDS = Object.freeze({
  settings: 'burmese_app_settings',
  speakProgress: 'speak_progress',
  courseProgress: 'burmese_course_progress',
  dialogueVoices: 'dialogue_voices',
  songLibrary: 'burmese_song_library_v1',
  songReviews: 'burmese_song_review_queue_v1'
});

export const DEVICE_BACKUP_EXCLUSIONS = Object.freeze([
  'Shared Study/SRS state and progress events in Supabase',
  'Server-side Speak activity logs',
  'Song reviews held only in the cloud or stored for another Google account',
  'Downloaded audio, media files, and offline caches'
]);

export function createDeviceBackup(storage, now = new Date()) {
  const data = {};
  for (const [field, key] of Object.entries(DEVICE_BACKUP_FIELDS)) {
    const raw = storage.getItem(key);
    if (raw === null) {
      data[field] = null;
      continue;
    }
    try {
      data[field] = JSON.parse(raw);
    } catch {
      throw new Error(`Cannot back up damaged local data (${field}). No file was downloaded.`);
    }
  }

  return {
    app: 'burmese_study',
    version: 2,
    scope: 'device_only',
    exportDate: now.toISOString(),
    data,
    excluded: [...DEVICE_BACKUP_EXCLUSIONS],
    restoreSupported: false
  };
}
