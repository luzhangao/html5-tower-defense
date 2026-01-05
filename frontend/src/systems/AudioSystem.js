/**
 * AudioSystem - basic sound pool for tower fire sounds.
 */
class AudioSystem {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.poolSize = 3;
  }

  preload() {
    const soundFiles = {
      cannon_fire: './assets/sounds/cannon.mp3',
      lmg_fire: './assets/sounds/lmg.mp3',
      hmg_fire: './assets/sounds/hmg.mp3',
      laser_fire: './assets/sounds/laser.mp3'
    };

    Object.entries(soundFiles).forEach(([key, path]) => {
      const pool = [];
      for (let i = 0; i < this.poolSize; i++) {
        const audio = new Audio(path);
        audio.volume = 0.3;
        pool.push(audio);
      }
      this.sounds[key] = pool;
    });
  }

  play(soundName) {
    if (!this.enabled) return;
    const pool = this.sounds[soundName];
    if (!pool) return;
    const sound = pool.find((item) => item.paused || item.ended);
    if (sound) {
      sound.currentTime = 0;
      sound.play();
    }
  }
}

export { AudioSystem };
export default AudioSystem;
