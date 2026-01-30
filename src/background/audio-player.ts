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
      // Check if chrome.offscreen API is available
      if (!chrome.offscreen) {
        console.error('chrome.offscreen API not available');
        throw new Error('Offscreen API not available');
      }

      // Check if offscreen document already exists
      if (chrome.runtime.getContexts) {
        const existingContexts = await chrome.runtime.getContexts({
          contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
        });

        if (existingContexts.length > 0) {
          console.log('Offscreen document already exists');
          this.offscreenDocumentCreated = true;
          return;
        }
      }

      // Create offscreen document for audio playback
      console.log('Creating offscreen document...');
      await chrome.offscreen.createDocument({
        url: 'src/offscreen.html',
        reasons: ['AUDIO_PLAYBACK' as chrome.offscreen.Reason],
        justification: 'Play elevator music in the background',
      });

      console.log('Offscreen document created successfully');

      // Give the offscreen document a moment to initialize
      await new Promise(resolve => setTimeout(resolve, 200));

      this.offscreenDocumentCreated = true;
    } catch (error) {
      console.error('Failed to create offscreen document:', error);
      throw error;
    }
  }

  private async sendToOffscreen(message: any): Promise<void> {
    try {
      console.log('Sending message to offscreen:', message.type);
      await chrome.runtime.sendMessage(message);
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Failed to send message to offscreen document:', error);
      // Reset the flag so we try to recreate the document next time
      this.offscreenDocumentCreated = false;
      throw error;
    }
  }
}
