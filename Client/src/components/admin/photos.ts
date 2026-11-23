/** What the photo editor changed: existing photos to keep, new links, new uploads. */
export interface PhotoChanges { keep: string[]; urls: string[]; files: File[] }

/** Appends photo changes to a FormData for the hotels / room-types API. */
export const appendPhotos = (form: FormData, changes: PhotoChanges, editing: boolean) => {
    if (editing) form.append('keepPhotos', JSON.stringify(changes.keep));
    if (changes.urls.length) form.append('photoUrls', JSON.stringify(changes.urls));
    changes.files.forEach(f => form.append('photos', f));
};

export const emptyPhotos = (existing: string[] = []): PhotoChanges => ({ keep: existing, urls: [], files: [] });

