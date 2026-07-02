/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { type Buffer } from 'node:buffer';

export class FrameStorageService {
  private store = new Map<string, Buffer[]>();
  private lastUpdate = new Map<string, number>();

  constructor() {
    // Jalankan pembersihan setiap 10 detik untuk track yang kadaluarsa (> 60 detik)
    // Ini jauh lebih ringan dari membuat 30 timer per detik
    setInterval(() => this.runCleanup(), 10_000);
  }

  private runCleanup() {
    const now = Date.now();

    for (const [trackId, time] of this.lastUpdate.entries()) {
      if (now - time > 60_000) {
        this.clearTrack(trackId);
      }
    }
  }

  /**
   * Menyimpan frame baru untuk suatu track.
   * - Menambahkan frame ke dalam list (penyimpanan baru jika track baru).
   * - Membatasi penyimpanan maksimal 100 frame terbaru.
   * - Waktu kadaluarsa otomatis ditangani oleh cleanup interval.
   *
   * @param trackId Nama track (contoh: track_{camera_id})
   * @param frameData Data frame
   */
  async saveFrame(trackId: string, frameData: string | Buffer): Promise<void> {
    if (!this.store.has(trackId)) {
      this.store.set(trackId, []);
    }

    const frames = this.store.get(trackId)!;

    // Masukkan frame terbaru di awal list
    frames.unshift(frameData as Buffer);

    // Pertahankan hanya 100 frame terbaru
    if (frames.length > 100) {
      frames.pop();
    }

    // Catat waktu frame terakhir masuk
    this.lastUpdate.set(trackId, Date.now());
  }

  /**
   * Mengambil frame yang tersimpan pada track tertentu.
   * @param trackId Nama track
   * @returns Array berisi data frame
   */
  async getFrames(trackId: string): Promise<Buffer[]> {
    const frames = this.store.get(trackId) || [];

    return [...frames];
  }

  /**
   * Menghapus penyimpanan frame untuk track tertentu secara manual (jika diperlukan).
   * @param trackId Nama track
   */
  async clearTrack(trackId: string): Promise<void> {
    this.store.delete(trackId);
    this.lastUpdate.delete(trackId);
  }
}

export const frameStorageService = new FrameStorageService();
