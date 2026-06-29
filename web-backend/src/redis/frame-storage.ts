import Redis from 'ioredis';

import { RedisConfig } from '../common/config/redis.config';

export class FrameStorageService {
  private redis: Redis;

  constructor() {
    if (!RedisConfig.url) {
      throw new Error('REDIS_URL is not defined in the configuration');
    }

    this.redis = new Redis(RedisConfig.url);
  }

  /**
   * Menyimpan frame baru untuk suatu track.
   * - Menambahkan frame ke dalam list (penyimpanan baru jika track baru).
   * - Membatasi penyimpanan maksimal 100 frame terbaru.
   * - Mengatur waktu kadaluarsa (TTL) menjadi 60 detik. Jika tidak ada frame baru selama 1 menit, otomatis dihapus.
   *
   * @param trackId Nama track (contoh: track_{camera_id})
   * @param frameData Data frame (bisa berupa Base64 string, URL, atau binary buffer)
   */
  async saveFrame(trackId: string, frameData: string | Buffer): Promise<void> {
    const key = `livekit:track_frames:${trackId}`;

    const pipeline = this.redis.pipeline();

    // Masukkan frame terbaru di awal list
    pipeline.lpush(key, frameData);

    // Pertahankan hanya 100 frame terbaru (index 0 sampai 99)
    pipeline.ltrim(key, 0, 99);

    // Reset TTL list menjadi 60 detik setiap ada frame baru masuk
    pipeline.expire(key, 60);

    await pipeline.exec();
  }

  /**
   * Mengambil frame yang tersimpan pada track tertentu.
   * @param trackId Nama track
   * @returns Array berisi data frame
   */
  async getFrames(trackId: string): Promise<Buffer[]> {
    const key = `livekit:track_frames:${trackId}`;

    return await this.redis.lrangeBuffer(key, 0, 99);
  }

  /**
   * Menghapus penyimpanan frame untuk track tertentu secara manual (jika diperlukan).
   * @param trackId Nama track
   */
  async clearTrack(trackId: string): Promise<void> {
    const key = `livekit:track_frames:${trackId}`;
    await this.redis.del(key);
  }
}

export const frameStorageService = new FrameStorageService();
