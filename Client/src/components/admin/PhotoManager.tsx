import React, { useEffect, useMemo, useState } from 'react';
import { BsPlusLg, BsTrash, BsUpload } from 'react-icons/bs';
import { photoSrc } from '../../utils/adminApi';

import type { PhotoChanges } from './photos';

interface PhotoManagerProps {
    existing: string[];
    value: PhotoChanges;
    onChange: (v: PhotoChanges) => void;
    max?: number;
}

/** Shows current photos with remove buttons, plus "add a link" and "upload" for new ones. */
const PhotoManager: React.FC<PhotoManagerProps> = ({ existing, value, onChange, max = 12 }) => {
    const [link, setLink] = useState('');
    const [error, setError] = useState('');
    const previews = useMemo(() => value.files.map(f => URL.createObjectURL(f)), [value.files]);
    useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews]);
    const total = value.keep.length + value.urls.length + value.files.length;

    const addLink = () => {
        const u = link.trim();
        if (!/^https:\/\/\S+$/i.test(u)) { setError('Use a secure image link starting with https://'); return; }
        if (total >= max) { setError(`Up to ${max} photos`); return; }
        onChange({ ...value, urls: [...value.urls, u] });
        setLink('');
        setError('');
    };

    const tile = (src: string, key: string, onRemove: () => void, badge?: string) => (
        <li key={key} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-stone dark:bg-graphite">
            <img src={src} alt="" className="h-full w-full object-cover" />
            {badge && <span className="absolute left-1.5 top-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase text-white">{badge}</span>}
            <button type="button" onClick={onRemove} aria-label="Remove photo"
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-700 shadow cursor-pointer">
                <BsTrash size={13} />
            </button>
        </li>
    );

    return (
        <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-umber dark:text-gray-300">Photos <span className="font-normal normal-case tracking-normal text-taupe">({total}/{max}, the first is the cover)</span></p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {existing.filter(p => value.keep.includes(p)).map(p => tile(photoSrc(p), p, () => onChange({ ...value, keep: value.keep.filter(x => x !== p) })))}
                {value.urls.map(u => tile(u, u, () => onChange({ ...value, urls: value.urls.filter(x => x !== u) }), 'New'))}
                {value.files.map((f, i) => tile(previews[i], `${f.name}-${i}`, () => onChange({ ...value, files: value.files.filter((_, j) => j !== i) }), 'Upload'))}
                {total < max && (
                    <li>
                        <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-wheat text-xs text-taupe hover:border-bronze hover:text-bronze dark:border-graphite">
                            <BsUpload size={18} /> Upload
                            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
                                onChange={e => {
                                    const files = Array.from(e.target.files || []).slice(0, max - total);
                                    onChange({ ...value, files: [...value.files, ...files] });
                                    e.target.value = '';
                                }} />
                        </label>
                    </li>
                )}
            </ul>
            <div className="mt-3 flex gap-2">
                <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="Or paste an image link (https://…)"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                    aria-label="Image link"
                    className="min-w-0 flex-1 rounded-lg border border-stone bg-white px-3 py-2 text-sm dark:border-graphite dark:bg-night dark:text-cream" />
                <button type="button" onClick={addLink} className="inline-flex items-center gap-1 rounded-lg border border-stone px-3 text-xs font-semibold uppercase tracking-[0.12em] text-umber hover:border-bronze dark:border-graphite dark:text-cream cursor-pointer">
                    <BsPlusLg /> Add
                </button>
            </div>
            {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
        </div>
    );
};

export default PhotoManager;
