const PHOTO_DRAFT_DB = 'elitesync-local-db';
const PHOTO_DRAFT_STORE = 'photo-drafts';

type PhotoDraftRecord = {
  uid: string;
  photos: string[];
  updatedAt: number;
};

function openPhotoDraftDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(PHOTO_DRAFT_DB, 1);

    request.onerror = () => reject(request.error ?? new Error('Unable to open local photo storage'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_DRAFT_STORE)) {
        db.createObjectStore(PHOTO_DRAFT_STORE, { keyPath: 'uid' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openPhotoDraftDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(PHOTO_DRAFT_STORE, mode);
    const store = transaction.objectStore(PHOTO_DRAFT_STORE);
    const request = handler(store);

    request.onerror = () => reject(request.error ?? new Error('Local photo storage request failed'));
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error ?? new Error('Local photo storage transaction failed'));
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read selected photo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compress an image data-URL via Canvas (max 800px, JPEG quality 0.6).
 */
function compressImage(dataUrl: string, maxDim = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to compress image'));
    img.src = dataUrl;
  });
}

export async function getPhotoDrafts(uid: string) {
  const record = await withStore<IDBValidKey | PhotoDraftRecord | undefined>('readonly', (store) => store.get(uid));
  return typeof record === 'object' && record && 'photos' in record && Array.isArray(record.photos) ? record.photos : [];
}

export async function savePhotoDrafts(uid: string, photos: string[]) {
  await withStore<IDBValidKey>('readwrite', (store) => store.put({ uid, photos, updatedAt: Date.now() } satisfies PhotoDraftRecord));
}

export async function clearPhotoDrafts(uid: string) {
  await withStore<IDBValidKey>('readwrite', (store) => store.delete(uid));
}

export async function convertFilesToDataUrls(files: File[]) {
  const rawUrls = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
  return Promise.all(rawUrls.map((url) => compressImage(url)));
}