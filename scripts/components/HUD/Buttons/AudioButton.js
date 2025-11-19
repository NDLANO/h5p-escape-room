import React from 'react';

import { H5PContext } from '../../../context/H5PContext.js';
import {
  createAudioPlayer,
  getAudioPlayerType,
  AUDIO_PLAYER_TYPES,
  fadeAudioInAndOut,
} from '../../../utils/audio-utils.js';
import Button from './Button/Button.js';
import PropTypes from 'prop-types';

export default class AudioButton extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;

    // Separate players for the different scenes
    this.players = {};

    // Keep track if scene audio has been turned on or not
    this.state = { audioOn: false };
  }

  /**
   * Determine player ID
   * @returns {string} Player id.
   */
  getPlayerId() {
    if (
      this.props.sceneId !== undefined &&
      this.props.sceneAudioTrack?.length &&
      !this.props.playlistId
    ) {
      return 'scene-' + this.props.sceneId;
    }

    if (
      this.props.playlistId !== undefined &&
      this.props.sceneAudioTrack?.length
    ) {
      return 'playlist-' + this.props.playlistId;
    }

    if (this.context.behavior.audio?.length) {
      return 'global';
    }

    if (
      this.context.behavior.playlist &&
      this.context.behavior.audioType === 'playlist'
    ) {
      return 'playlist-' + this.context.behavior.playlist;
    }

    return '';
  }

  /**
   * Get tracks from given player id.
   * @param {string} id Player id.
   * @returns {object[]} Tracks.
   */
  getTrack(id) {
    return id === 'global'
      ? this.context.behavior.audio
      : this.props.sceneAudioTrack;
  }

  /**
   * Get audio player for the current track.
   * @param {string} id Player id.
   * @returns {HTMLAudioElement|null} or 'null' if track isn't playable.
   */
  getPlayer(id) {
    if (!id) {
      return null;
    }

    const playerId = this.props.playerId || this.context.contentId;

    // Create player if none exist
    if (this.players[id] === undefined) {
      this.players[id] = createAudioPlayer(
        playerId,
        this.getTrack(id),
        () => {
          this.props.onIsPlaying(id);

          if (!this.players[id].audioTrack) {
            this.players[id].audioTrack = 0;
          }
        },
        () => {
          /*
           * Current track ended, and player is playlist with multiple tracks
           * (else it is looped)
           */
          const currentTrackNumber = this.players[id].audioTrack
            ? this.players[id].audioTrack
            : 0;
          const trackList = this.getTrack(id);

          const newTrackNumber =
            trackList.length - 1 === currentTrackNumber
              ? 0
              : currentTrackNumber + 1;

          const newTrackPath = H5P.getPath(
            trackList[newTrackNumber].path,
            this.context.contentId
          );

          const currentPlayer = this.players[id];

          // Play next track
          currentPlayer.audioTrack = newTrackNumber;
          currentPlayer.src = newTrackPath;
          currentPlayer.load();
          currentPlayer.play();
          this.props.onIsPlaying(id);
        },
        () => {
          if (this.props.isPlaying === id) {
            this.props.onIsPlaying(null);
          }
        },
        (!this.props.playlistId || this.getTrack(id).length < 2)
      );
    }

    this.props.updateSceneAudioPlayers(this.players);

    return this.players[id];
  }

  /**
   * Handle audio button clicked
   */
  handleClick() {
    // Set correct state for if scene audio is on or off
    this.setState({
      audioOn: !this.state.audioOn
    });

    // Determine player ID
    const id = this.getPlayerId();
    const player = this.getPlayer(id);

    if (!player) {
      return;
    }

    if (id === this.props.isPlaying) {
      // Reset sceneWasPlaying
      this.props.onSceneWasPlaying(null);

      // Pause and reset the player
      fadeAudioInAndOut(player, null, false);
    }
    else {
      // Find out if there is an interaction playing
      const lastPlayer =
        getAudioPlayerType(this.props.isPlaying) === AUDIO_PLAYER_TYPES['interaction'] ?
          this.props.interactionAudioPlayers[this.props.isPlaying] :
          null;

      // Pause if lastplayer, then start the playback!
      fadeAudioInAndOut(lastPlayer, player, true);
    }
  }

  /**
   * React lify-cycle handler: Component did update.
   * @param {object} prevProps React props before update.
   */
  componentDidUpdate(prevProps) {
    if (this.props.isPlaying && this.props.isPlaying !== prevProps.isPlaying) {
      // Audio Player has changed

      // If not scene audio is playing then change state for audioOn
      if (!(
        [AUDIO_PLAYER_TYPES['scene'], AUDIO_PLAYER_TYPES['playlist']]
          .includes(getAudioPlayerType(this.props.isPlaying))
      )) {
        this.setState({ audioOn: false });
      }

      if (
        [AUDIO_PLAYER_TYPES['scene'], AUDIO_PLAYER_TYPES['playlist']]
          .includes(getAudioPlayerType(prevProps.isPlaying))
      ) {
        // Thas last player was us, we need to stop it

        const lastPlayer = this.getPlayer(prevProps.isPlaying);
        if (lastPlayer) {
          // Save the prev player from this scene
          this.props.onSceneWasPlaying(prevProps.isPlaying);

          // Pause and reset the last player
          fadeAudioInAndOut(lastPlayer, null, false);
        }
      }
    }

    if (
      [AUDIO_PLAYER_TYPES['scene'], AUDIO_PLAYER_TYPES['playlist']]
        .includes(getAudioPlayerType(this.props.isPlaying)) ||
      (this.props.sceneId !== prevProps.sceneId && this.state.audioOn === true)
    ) {
      // Playing something or we changed scene and scene audio is on
      const currentPlayerId = this.getPlayerId();

      if (this.props.isPlaying !== currentPlayerId) {
        // Playing the audio track from another scene... Need to change track!
        const isPlayer = this.getPlayer(this.props.isPlaying);
        const currentPlayer = this.getPlayer(currentPlayerId);

        // Pause and reset last player, and start the current player
        fadeAudioInAndOut(isPlayer, currentPlayer, false);
      }
    }

    if (
      [AUDIO_PLAYER_TYPES['scene'], AUDIO_PLAYER_TYPES['playlist']]
        .includes(getAudioPlayerType(this.props.isPlaying))
    ) {
      const isNewScene = this.props.sceneId !== prevProps.sceneId;
      if (this.props.restartAudioOnSceneStart && isNewScene) {
        const currentPlayerId = this.getPlayerId();
        const player = this.getPlayer(currentPlayerId);

        if (
          player &&
          getAudioPlayerType(currentPlayerId) === AUDIO_PLAYER_TYPES['playlist']
        ) {
          // Pause
          player?.pause();

          // Get the first track
          const trackList = this.getTrack(currentPlayerId);
          const newTrackPath = H5P.getPath(
            trackList[0].path,
            this.context.contentId
          );
          player.audioTrack = 0;
          player.src = newTrackPath;
          player.load();

          // Play
          player.play();
        }
        else if (player) {
          player.currentTime = 0;
        }
      }
    }

    if (
      !this.props.isPlaying &&
      this.props.sceneWasPlaying &&
      getAudioPlayerType(prevProps.isPlaying) ===
        AUDIO_PLAYER_TYPES['interaction']
    ) {
      // An interaction audio is over and we played scene audio or global audio before that!

      const lastPlayer = this.getPlayer(this.props.sceneWasPlaying);
      const currentPlayerId = this.getPlayerId();

      if (lastPlayer && this.props.sceneWasPlaying === currentPlayerId) {
        // Play the scene audio or global audio if it matches the current scene
        fadeAudioInAndOut(null, lastPlayer, false);
      }
      else if (currentPlayerId) {
        // Else the user moved directly to new scene when playing interaction audio
        const currentPlayer = this.getPlayer(currentPlayerId);

        if (currentPlayer) {
          // Then play the current scene audio or global audio
          fadeAudioInAndOut(null, currentPlayer, false);
        }
      }
    }
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    const id = this.getPlayerId();
    if (!id) {
      return null;
    }

    const type = 'audio-track' + (this.props.isPlaying === id ? ' active' : '');
    return (
      <Button
        type={type}
        tabIndex={ this.props.tabIndex }
        focus={ this.props.focus }
        label={
          this.props.isPlaying === id
            ? this.context.l10n.pauseAudioTrack
            : this.context.l10n.playAudioTrack
        }
        isHiddenBehindOverlay={this.props.isHiddenBehindOverlay}
        onClick={this.handleClick.bind(this)}
      />
    );
  }
}

AudioButton.contextType = H5PContext;

AudioButton.propTypes = {
  sceneId: PropTypes.number,
  sceneAudioTrack: PropTypes.array,
  playlistId: PropTypes.number,
  playerId: PropTypes.string,
  isPlaying: PropTypes.string,
  interactionAudioPlayers: PropTypes.object.isRequired,
  updateSceneAudioPlayers: PropTypes.func.isRequired,
  onIsPlaying: PropTypes.func.isRequired,
  onSceneWasPlaying: PropTypes.func.isRequired,
  restartAudioOnSceneStart: PropTypes.bool,
  isHiddenBehindOverlay: PropTypes.bool.isRequired,
  tabIndex: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  focus: PropTypes.bool,
  sceneWasPlaying: PropTypes.string
};

AudioButton.defaultProps = {
  sceneId: undefined,
  sceneAudioTrack: [],
  playlistId: undefined,
  playerId: undefined,
  isPlaying: null,
  restartAudioOnSceneStart: false,
  tabIndex: 0,
  focus: false
};
