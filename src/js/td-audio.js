/*
 * AudioSystem - basic sound pool for tower fire sounds.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	function AudioSystem() {
		this.sounds = {};
		this.enabled = true;
		this.poolSize = 3;
	}

	AudioSystem.prototype.preload = function () {
		var soundFiles = {
			cannon_fire: "assets/sounds/cannon.mp3",
			lmg_fire: "assets/sounds/lmg.mp3",
			hmg_fire: "assets/sounds/hmg.mp3",
			laser_fire: "assets/sounds/laser.mp3"
		};

		var name;
		for (name in soundFiles) {
			if (!soundFiles.hasOwnProperty(name)) continue;
			var path = soundFiles[name];
			var pool = [];
			for (var i = 0; i < this.poolSize; i++) {
				var audio = new Audio(path);
				audio.volume = 0.3;
				pool.push(audio);
			}
			this.sounds[name] = pool;
		}
	};

	AudioSystem.prototype.play = function (soundName) {
		if (!this.enabled) return;
		var pool = this.sounds[soundName];
		if (!pool || !pool.length) return;
		for (var i = 0; i < pool.length; i++) {
			var sound = pool[i];
			if (sound.paused || sound.ended) {
				sound.currentTime = 0;
				sound.play();
				break;
			}
		}
	};

	TD.AudioSystem = AudioSystem;
}); // _TD.a.push end
