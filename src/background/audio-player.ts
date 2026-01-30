// ABOUTME: Audio player abstraction managing offscreen document for MV3
// ABOUTME: Handles play/pause/volume and communicates with offscreen audio element

export class AudioPlayer {
  private volume = 80;
  private playing = false;
  private currentUrl: string | null = null;

  async play(url: string): Promise<void> {
    this.currentUrl = url;
    this.playing = true;

    // In real implementation, this would create offscreen document
    // For now, simplified for testing
    await this.sendToOffscreen({ type: 'PLAY', url });
  }

  pause(): void {
    this.playing = false;
    this.sendToOffscreen({ type: 'PAUSE' });
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(100, volume));
    this.sendToOffscreen({ type: 'SET_VOLUME', volume: this.volume });
  }

  getVolume(): number {
    return this.volume;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private async sendToOffscreen(message: any): Promise<void> {
    // Simplified for testing - real implementation would use chrome.runtime.sendMessage
    // to communicate with offscreen document
  }
}
