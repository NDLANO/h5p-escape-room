import React from 'react';
import './HUD.scss';

import { H5PContext } from '../../context/H5PContext';
import AudioButton from './Buttons/AudioButton';
import Button from './Buttons/Button/Button';
import { SceneTypes } from '../Scene/Scene';

export default class HUD extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.state = {
      currentButtonIndex: 0
    };

    this.audioButtonRef = React.createRef();
    this.sceneDescriptionButtonRef = React.createRef();
    this.resetButtonRef = React.createRef();
    this.goToStartButtonRef = React.createRef();
    this.scoreSummaryButtonRef = React.createRef();

    this.buttons = {};
  }

  /**
   * Add button refs.
   */
  addButtonRefs() {
    this.buttons = {};

    // Audio button
    if (this.props.scene.audio) {
      this.buttons['audio'] = this.audioButtonRef;
    }

    // Scene description button
    if (this.props.scene.scenedescription) {
      this.buttons['scene-description'] = this.sceneDescriptionButtonRef;
    }

    // Reset button
    if (this.props.scene.sceneType === SceneTypes.THREE_SIXTY_SCENE) {
      this.buttons['reset'] = this.resetButtonRef;
    }

    // Go to start button
    if (this.props.showHomeButton && !this.props.isStartScene) {
      this.buttons['go-to-start'] = this.goToStartButtonRef;
    }

    // Score summary button
    if (this.props.showScoresButton) {
      this.buttons['score-summary'] = this.scoreSummaryButtonRef;
    }
  }

  /**
   * Move button focus.
   * @param {number} offset Offset to move position by.
   */
  moveButtonFocus(offset) {
    if (typeof offset !== 'number') {
      return;
    }

    if (
      this.state.currentButtonIndex + offset < 0 ||
      this.state.currentButtonIndex + offset > Object.keys(this.buttons).length - 1
    ) {
      return; // Don't cycle
    }

    const buttonReference =
      Object.values(this.buttons)[this.state.currentButtonIndex + offset];

    if (!buttonReference?.current) {
      this.moveButtonFocus(offset + 1 * Math.sign(offset));
      return;
    }

    this.setState({
      currentButtonIndex: this.state.currentButtonIndex + offset,
      focusButton: this.state.currentButtonIndex + offset
    });
  }

  /**
   * Get tabindex for button.
   * @param {string} type Button type.
   * @returns {string} Tabindex.
   */
  getButtonTabIndex(type) {
    return (Object.keys(this.buttons)[this.state.currentButtonIndex] === type) ?
      '0' :
      '-1';
  }

  /**
   * Determine whether button should get focus.
   * @param {string} type Button type.
   * @returns {boolean} True, if button should get focus..
   */
  getButtonFocus(type) {
    if (typeof this.state.focusButton !== 'number') {
      return false;
    }

    return (Object.keys(this.buttons)[this.state.focusButton] === type);
  }

  /**
   * Handle key down.
   * @param {React.KeyboardEvent} event Keyboard event.
   */
  handleKeydown(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      this.moveButtonFocus(-1);
    }
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      this.moveButtonFocus(1);
    }
    else if (event.key === 'Home') {
      const homeButtonIndex =
        Object.values(this.buttons).findIndex((button) => button.current);

      if (homeButtonIndex !== -1) {
        this.moveButtonFocus(homeButtonIndex - this.state.currentButtonIndex);
      }
    }
    else if (event.key === 'End') {
      const endButtonIndex =
        Object.values(this.buttons).findLastIndex((button) => button.current);

      if (endButtonIndex !== -1) {
        this.moveButtonFocus(endButtonIndex - this.state.currentButtonIndex);
      }
    }
    else {
      return;
    }

    event.preventDefault();
  }

  /**
   * Handle receiving focus.
   */
  handleFocus() {
    this.setState({ focusButton: this.state.currentButtonIndex });
  }

  /**
   * Handle blur.
   */
  handleBlur() {
    this.setState({ focusButton: null });
  }

  /**
   * Get scene audio track.
   * @param {object} scene Scene to get track for.
   * @returns {object} Audio track props.
   */
  getSceneAudioTrack(scene) {
    const props = {
      isPlaying: this.props.audioIsPlaying,
      onIsPlaying: this.props.onAudioIsPlaying,
      sceneWasPlaying: this.props.sceneAudioWasPlaying,
      onSceneWasPlaying: this.props.onSceneAudioWasPlaying,
      isHiddenBehindOverlay: this.props.isHiddenBehindOverlay,
      nextFocus: this.props.nextFocus,
      restartAudioOnSceneStart: scene.restartAudioOnSceneStart,
      updateSceneAudioPlayers: this.props.updateSceneAudioPlayers,
      interactionAudioPlayers: this.props.interactionAudioPlayers,
    };

    if (
      scene?.audio?.length > 0 &&
      (!scene.audioType || scene.audioType === 'audio')
    ) {
      props.sceneAudioTrack = scene.audio;
      props.sceneId = scene.sceneId;
    }

    if (scene?.audioType === 'playlist' && scene?.playlist) {
      const playlist = this.getPlaylistFromParent(
        scene, this.context.params.playlists
      );
      if (playlist != null) {
        props.sceneAudioTrack = playlist.audioTracks;
        props.playlistId = playlist.playlistId;
        props.sceneId = scene.sceneId;
      }
    }

    const noSceneAudio = (scene?.audioType === 'audio') && !scene?.audio;
    const noScenePlaylist = (scene?.audioType === 'playlist') && !scene?.playlist;

    if (
      scene && (noSceneAudio || noScenePlaylist) &&
      this.context.behavior?.playlist
    ) {
      const playlist = this.getPlaylistFromParent(
        this.context.behavior, this.context.params.playlists
      );
      if (playlist != null) {
        props.sceneAudioTrack = playlist.audioTracks;
        props.playlistId = playlist.playlistId;
        props.sceneId = scene.sceneId;
      }
    }

    return props;
  }

  /**
   * Get playlist from parent.
   * @param {object} parent Parent.
   * @param {object} playlists Playlists.
   * @returns {object|null} Playlist.
   */
  getPlaylistFromParent(parent, playlists) {
    const parentHasPlaylist = (parent !== null) &&
      (parent.playlist !== null) && (parent.audioType === 'playlist');

    if (parentHasPlaylist && (playlists != null)) {
      return playlists.find((playlist) => {
        return playlist.playlistId === parent.playlist;
      });
    }

    return null;
  }

  /**
   * Show scene description.
   */
  showSceneDescription() {
    this.props.onSceneDescription(this.props.scene.scenedescription);
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    this.addButtonRefs();
    const showScoresButton = this.props.showScoresButton;
    const showHomeButton = this.props.showHomeButton;
    const isThreeSixty =
      this.props.scene.sceneType === SceneTypes.THREE_SIXTY_SCENE;

    return (
      <div className="hud" aria-hidden={ this.props.isHiddenBehindOverlay ?
        true :
        undefined
      }>
        <div className="hud-top-right">
        </div>
        <div
          className="hud-bottom-left"
          role="toolbar"
          aria-label={ this.context.l10n.mainToolbar }
          aria-controls={ this.props.ariaControls }
          onFocus={ () => {
            this.handleFocus();
          }}
          onBlur={ () => {
            this.handleBlur();
          }}
          onKeyDown={ (event) => {
            this.handleKeydown(event);
          }}
        >
          <AudioButton
            ref={ this.buttons['audio'] }
            tabIndex={ this.getButtonTabIndex('audio') }
            focus={ this.getButtonFocus('audio') }
            { ...this.getSceneAudioTrack(this.props.scene) }
          />
          { this.props.scene.scenedescription &&
            <Button
              type={ 'scene-description' }
              ref={ this.buttons['scene-description'] }
              tabIndex={ this.getButtonTabIndex('scene-description') }
              focus={ this.getButtonFocus('scene-description') }
              label={ this.context.l10n.sceneDescription }
              isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
              nextFocus={ this.props.nextFocus }
              onClick={ this.showSceneDescription.bind(this) }
            />
          }
          {
            isThreeSixty &&
            <Button
              type={ 'reset' }
              ref={ this.buttons['reset'] }
              tabIndex={ this.getButtonTabIndex('reset') }
              focus={ this.getButtonFocus('reset') }
              label={ this.context.l10n.resetCamera }
              isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
              nextFocus={ this.props.nextFocus }
              onClick={ this.props.onCenterScene }
            />
          }{
            showHomeButton &&
            <Button
              type={ 'go-to-start' }
              ref={ this.buttons['go-to-start'] }
              tabIndex={ this.getButtonTabIndex('go-to-start') }
              focus={ this.getButtonFocus('go-to-start') }
              label={this.props.isStartScene ?
                this.context.l10n.userIsAtStartScene :
                this.context.l10n.goToStartScene
              }
              isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
              nextFocus={ this.props.nextFocus }
              onClick={ this.props.onGoToStartScene }
              disabled = {this.props.isStartScene}
            />
          }{
            showScoresButton &&
            <Button
              type={ 'score-summary' }
              ref={ this.buttons['score-summary'] }
              tabIndex={ this.getButtonTabIndex('score-summary') }
              focus={ this.getButtonFocus('score-summary') }
              label={ this.context.l10n.scoreSummary }
              isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
              nextFocus={ this.props.nextFocus }
              onClick={ this.props.onShowingScoreSummary }
            />
          }
        </div>
      </div>
    );
  }
}

HUD.contextType = H5PContext;
