const fadeAudioOut = (player, resetCurrentTime, fadeInAudio) => {
  if (player.volume > 0) {
    const newVolume = Number(player.volume - 0.1).toFixed(1);
    player.volume = newVolume;
    setTimeout(() => {
      fadeAudioOut(player, resetCurrentTime, fadeInAudio);
    }, 25);
  }
  else {
    player.volume = 0;
    player.pause();

    if (resetCurrentTime) {
      player.currentTime = 0;
    }

    // Then, fade in new player
    if (fadeInAudio) {
      fadeInAudio();
    }
  }
};

const fadeAudioIn = (player, int) => {
  if (player.volume === 1 && int === 0) {
    player.volume = 0;
  }

  if (player.volume >= 1) {
    return;
  }

  if (player.volume === 0 && int === 0) {
    player.play();
  }

  const newVolume = Number(player.volume + 0.1).toFixed(1);
  player.volume = newVolume;

  if (player.volume !== 1) {
    setTimeout(() => {
      fadeAudioIn(player, 1);
    }, 25);
  }
};

/**
 * Help create the audio player and find the approperiate source.
 *
 * @param {number} contentId Content ID
 * @param {Array} sources
 * @param {() => void} onPlay Callback
 * @param {() => void} onEnd Callback, run when the track ends
 * @param {() => void} onStop Callback, run when the player is paused
 * @param {boolean} loop
 * @return {HTMLAudioElement}
 */
export const createAudioPlayer = (
  contentId,
  sources,
  onPlay,
  onEnd,
  onStop,
  loop
) => {
  // Check if browser supports audio.
  let player = document.createElement('audio');
  if (player.canPlayType !== undefined) {
    // Add supported source files.
    sources
      .filter((source) => player.canPlayType(source.mime))
      .forEach((source) => {
        const sourceElement = document.createElement('source');
        sourceElement.src = H5P.getPath(source.path, contentId);
        sourceElement.type = source.mime;
        player.appendChild(sourceElement);
      });
  }

  const noSourcesAreSupported = player.children.length < 1;
  if (noSourcesAreSupported) {
    player = null;
  }
  else {
    player.controls = false;
    player.preload = 'auto';
    player.loop = loop;
    player.addEventListener('play', onPlay);
    player.addEventListener('ended', onEnd);
    player.addEventListener('pause', onStop);
  }

  return player;
};

/**
 * Determine if the ID of the player belongs to a scene audio track.
 *
 * @param {string} id
 * @return {boolean}
 */
export const isInteractionAudio = (id) => {
  return id?.indexOf('interaction-') === 0;
};

/**
 * Determine if the ID of the player belongs to a video interaction.
 *
 * @param {string} id
 * @return {boolean}
 */
export const isVideoAudio = (id) => {
  return id?.indexOf('video-') === 0;
};

/**
 * Determine if the ID of the player belongs to a playlist.
 *
 * @param {string} id
 * @return {boolean}
 */
export const isPlaylistAudio = (id) => {
  return id === 'global' || id?.indexOf('playlist-') === 0;
};

/**
 * Determine if the ID of the player belongs to a scene audio track.
 *
 * @param {string} id
 * @return {boolean}
 */
export const isSceneAudio = (id) => {
  return id?.indexOf('scene-') === 0;
};

export const playerIsFading = (player) => player.volume > 0 && player.volume < 1;

export const fadeAudioInAndOut = (oldPlayer, newPlayer, resetCurrentTime) => {
  // Fade out old player
  if (oldPlayer && !newPlayer) {
    // Check that the player is not already fading
    if (!playerIsFading(oldPlayer)) {
      fadeAudioOut(oldPlayer, resetCurrentTime, null);
    }
  }

  // Fade out old player, then fade in new player
  else if (oldPlayer && newPlayer) {
    // Check that the players are not already fading
    if (!playerIsFading(oldPlayer) && !playerIsFading(newPlayer)) {
      fadeAudioOut(
        oldPlayer,
        resetCurrentTime,
        () => {
          fadeAudioIn(newPlayer, 0);
        }
      );
    }
  }

  // Fade in new player
  else if (!oldPlayer && newPlayer) {
    // Check that the player is not already fading
    if (!playerIsFading(newPlayer)) {
      fadeAudioIn(newPlayer, 0);
    }
  }
};
