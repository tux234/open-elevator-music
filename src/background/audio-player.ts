// ABOUTME: Audio player abstraction managing offscreen document for MV3
// ABOUTME: Handles play/pause/volume and communicates with offscreen audio element

export class AudioPlayer {
  private volume = 80;
  private playing = false;
  private currentUrl: string | null = null;
  private offscreenDocumentCreated = false;

  async play(url: string): Promise<void> {
    this.currentUrl = url;
    this.playing = true;

    await this.ensureOffscreenDocument();
    await this.sendToOffscreen({ type: 'PLAY', url });
  }

  async pause(): Promise<void> {
    this.playing = false;
    await this.ensureOffscreenDocument();
    await this.sendToOffscreen({ type: 'PAUSE' });
  }

  async setVolume(volume: number): Promise<void> {
    this.volume = Math.max(0, Math.min(100, volume));
    await this.ensureOffscreenDocument();
    await this.sendToOffscreen({ type: 'SET_VOLUME', volume: this.volume });
  }

  getVolume(): number {
    return this.volume;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private async ensureOffscreenDocument(): Promise<void> {
    if (this.offscreenDocumentCreated) {
      return;
    }

    try {
      // Check if offscreen document already exists
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
      });

      if (existingContexts.length > 0) {
        this.offscreenDocumentCreated = true;
        return;
      }

      // Create offscreen document for audio playback
      await chrome.offscreen.createDocument({
        url: 'src/offscreen.html',
        reasons: ['AUDIO_PLAYBACK' as chrome.offscreen.Reason],
        justification: 'Play elevator music in the background',
      });

      // Give the offscreen document a moment to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      this.offscreenDocumentCreated = true;
    } catch (error) {
      console.error('Failed to create offscreen document:', error);
      // Continue anyway - offscreen document might already exist
      this.offscreenDocumentCreated = true;
    }
  }

  private async sendToOffscreen(message: any): Promise<void> {
    try {
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error('Failed to send message to offscreen document:', error);
    }
  }
}
