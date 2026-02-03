
class AudioService {
  private audioContext: AudioContext | null = null;
  private microphoneStream: MediaStream | null = null;
  private isProcessing = false;
  private isStarting = false;
  private recognition: any = null;

  async startListening(onTranscript: (text: string) => void) {
    if (this.isProcessing || this.isStarting) return;
    
    this.isStarting = true;
    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn("[AudioService] SpeechRecognition not available in this environment");
        // 已拿到麦克风权限但无法转写时，及时释放资源，避免“占用麦克风但不工作”
        this.stopListening();
        return;
      }
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true; 
        this.recognition.lang = 'zh-CN';

        this.recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            onTranscript(currentTranscript);
          }
        };

        this.recognition.onerror = (err: any) => {
          console.error("Recognition Error:", err);
          if (err.error === 'no-speech') return;
          
          if (this.isProcessing) {
            this.restartRecognition();
          }
        };

        this.recognition.onend = () => {
          if (this.isProcessing) {
            this.restartRecognition();
          }
        };

        try {
          this.recognition.start();
          this.isProcessing = true;
        } catch (e) {
          console.error("Failed to start recognition:", e);
        }
      }
    } catch (e) {
      console.error("Audio initialization failed:", e);
    } finally {
      this.isStarting = false;
    }
  }

  private restartRecognition() {
    if (!this.isProcessing || this.isStarting) return;
    
    setTimeout(() => {
      try {
        if (this.isProcessing && this.recognition) {
          this.recognition.start();
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'InvalidStateError')) {
          console.error("Error during recognition restart:", e);
        }
      }
    }, 400); 
  }

  stopListening() {
    this.isProcessing = false;
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.onerror = null;
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn("Recognition already stopped");
      }
      this.recognition = null;
    }
    this.microphoneStream?.getTracks().forEach(t => t.stop());
    this.audioContext?.close();
    this.audioContext = null;
  }

  triggerKillSwitch() {
    this.triggerHaptic('heavy');
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // 采用极具冲击力的警示音效
    osc.type = 'sawtooth'; 
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.05);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 30, 100, 30, 300]);
    }
  }

  triggerHaptic(type: 'light' | 'heavy' = 'light') {
    if ('vibrate' in navigator) {
      navigator.vibrate(type === 'heavy' ? [60, 40, 60] : 20);
    }
  }

  playMechanicalSound() {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, this.audioContext.currentTime);
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.05);
  }
}

export const audioService = new AudioService();
