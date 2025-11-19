import React from 'react';
import Scene, { SceneTypes } from './Scene/Scene.js';
import Dialog from './Dialog/Dialog.js';
import Screenreader from './Screenreader/Screenreader.js';
import InteractionContent from './Dialog/InteractionContent.js';
import { H5PContext } from '../context/H5PContext.js';
import './Main.scss';
import HUD from './HUD/HUD.js';
import FullscreenButton from './FullscreenButton/FullscreenButton.js';
import NoScene from './Scene/NoScene.js';
import PasswordContent from './Dialog/PasswordContent.js';
import ScoreSummary from './Dialog/ScoreSummary.js';
import ZoomButtons from './ZoomButtons/ZoomButtons.js';
import {
  createAudioPlayer,
  fadeAudioInAndOut,
  getAudioPlayerType,
  AUDIO_PLAYER_TYPES
} from '../utils/audio-utils.js';
import PropTypes from 'prop-types';

export default class Main extends React.Component {
  /**
   * @class
   * @param {object} props React properties.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.audioPlayers = {};
    this.sceneAudioPlayers = {};

    this.state = {
      zoomPercentage: 0,
      threeSixty: null,
      showingTextDialog: false,
      currentText: null,
      showingInteraction: false,
      showingPassword: false,
      showingScoreSummary: false,
      currentInteraction: null,
      sceneHistory: [],
      audioIsPlaying: null,
      sceneAudioWasPlaying: null,
      focusedInteraction: null,
      isEditingInteraction: false,
      nextFocus: null,
      sceneWaitingForLoad: null,
      scenesOpened: [],
      updateThreeSixty: false,
      startBtnClicked: false,
      scoreCard: {},
      maxZoomedIn: false,
      maxZoomedOut: true,
      zoomScale: 1,
      zoomPercentage: 0,
      labelBehavior: {
        showLabel: true,
        labelPosition: 'right'
      }
    };

    this.isVeryFirstRenderDone = this.props.isVeryFirstRenderDone ?? false;
    this.show360Affordance = true; // No need to use state for this

    this.documentID = `document-dom-${H5P.createUUID()}`;
  }

  /**
   * React life-cycle handler: component did mount.
   */
  componentDidMount() {
    // Listen for focus to interaction
    this.context.on('focusInteraction', (e) => {
      this.setState({
        focusedInteraction: e.data[0],
        isEditingInteraction: e.data[1]
      });
    });

    // Update edit state to false after done editing event
    this.context.on('updateEditStateInteraction', () => {
      this.setState({
        isEditingInteraction: false
      });
    });

    // Show scene description when scene starts for the first time, if specified
    if (!this.context.extras.isEditor && this.props.currentScene != null) {
      this.handleSceneDescriptionInitially(this.props.currentScene);
    }
    this.setState({ scoreCard: this.initialScoreCard() });

    if (this.context.extras.isEditor) {
      // Make sure user is warned before closing the window
      window.addEventListener('beforeunload', (e) => {
        if (
          e.target.body.firstChild.classList.contains('h5p-threeimage-editor') ||
          ( this.state.scoreCard.totalQuestionsCompleted === 0 &&
            this.state.scoreCard.totalCodesEntered === 0
          )
        ) {
          return;
        }
        e.preventDefault();
        e.returnValue = '';
      });
    }
  }

  /**
   * React life-cycle handler: component did update.
   * @param {object} prevProps React properties before update.
   * @param {object} prevState React state before update.
   */
  componentDidUpdate(prevProps, prevState) {
    if (this.state.threeSixty) {
      this.isVeryFirstRenderDone = true;
    }

    if (this.state.updateThreeSixty) {
      this.setState({
        updateThreeSixty: false
      });
    }

    if (this.state.labelBehavior && this.context.behavior.label) {
      if (
        this.state.labelBehavior.showLabel !==
          this.context.behavior.label.showLabel ||
        this.state.labelBehavior.labelPosition !==
          this.context.behavior.label.labelPosition
      ) {
        this.setState({
          labelBehavior: {
            showLabel: this.context.behavior.label.showLabel,
            labelPosition: this.context.behavior.label.labelPosition,
          },
          updateThreeSixty: true
        });
      }
    }

    if (
      this.state.startBtnClicked &&
      this.props.currentScene !== this.context.params.startSceneId
    ) {
      this.setState({
        startBtnClicked: false
      });
    }

    const validScenes = this.context.params.scenes.map((scene) => {
      return scene.sceneId;
    });

    const prunedHistory = this.state.sceneHistory.filter((sceneId) => {
      return validScenes.includes(sceneId);
    });

    // Scene has been removed from params, but not yet from history
    if (this.state.sceneHistory.length !== prunedHistory.length) {
      let lastElement = prunedHistory[prunedHistory.length - 1];
      // Remove current scene if it is at the top of the history
      while (lastElement === this.props.currentScene) {
        prunedHistory.pop();
        lastElement = prunedHistory.length
          ? prunedHistory[prunedHistory.length - 1]
          : null;
      }
      this.setState({
        sceneHistory: prunedHistory,
      });
    }

    if (this.props.currentScene !== prevProps.currentScene) {

      // We skip adding to history if we navigated backwards
      if (this.skipHistory) {
        this.skipHistory = false;
        return;
      }

      this.setState({
        sceneHistory: [
          ...this.state.sceneHistory,
          prevProps.currentScene,
        ],
      });
    }

    if (this.state.audioIsPlaying && this.state.audioIsPlaying !== prevState.audioIsPlaying) {
      // Something is playing audio
      if (
        getAudioPlayerType(prevState.audioIsPlaying) === AUDIO_PLAYER_TYPES['interaction']
      ) {
        // The last player was us, we need to stop it
        const lastPlayer = this.getAudioPlayer(prevState.audioIsPlaying);
        fadeAudioInAndOut(lastPlayer, null, true);
      }
    }

    // Listen for zoomed in and out
    const zoomControls = this.state.threeSixty?.zoomControls;

    zoomControls?.on('zoomin', () => {
      const zoomPercentage = zoomControls?.zoomPercentage;
      const zoomScale = this.calculateZoomScale(zoomPercentage);

      this.updateZoomState(zoomScale, zoomPercentage);
    });

    zoomControls?.on('zoomout', () => {
      const zoomPercentage = zoomControls?.zoomPercentage;
      const zoomScale = this.calculateZoomScale(zoomPercentage);

      this.updateZoomState(zoomScale, zoomPercentage);
    });
  }

  /**
   * Set what interaction was focussed.
   * @param {number} focusedInteraction Index of interaction that got focus.
   */
  setFocusedInteraction(focusedInteraction) {
    this.setState({
      focusedInteraction: focusedInteraction,
    });
  }

  /**
   * Remove focus from all interactions.
   */
  blurInteraction() {
    this.setState({
      focusedInteraction: null,
    });
  }

  /**
   * Get initial score card.
   * @returns {object} Score card.
   */
  initialScoreCard() {
    const scoreCard = {
      numQuestionsInTour: 0,
      totalQuestionsCompleted: 0,
      totalCodesEntered: 0,
      totalCodesUnlocked: 0,
      sceneScoreCards: {}
    };

    for (const sceneId in this.context.params.scenes) {
      const scene = this.context.params.scenes[sceneId];
      scoreCard.sceneScoreCards[scene.sceneId] = this.initializeSceneScoreCard(scene);
      scoreCard.numQuestionsInTour += scoreCard.sceneScoreCards[scene.sceneId].numQuestionsInScene;
    }
    return scoreCard;
  }

  /**
   * Get initial scene score card.
   * @param {object} scene Scene parameters.
   * @returns {object} Scene score card.
   */
  initializeSceneScoreCard(scene) {
    const sceneScoreCard = {
      title: scene.scenename,
      numQuestionsInScene: 0,
      scores: {}
    };

    scene?.interactions?.forEach((interaction, index) => {
      const maxScore = this.getQuestionMaxScore(interaction);
      if (!maxScore) {
        return;
      }

      sceneScoreCard.scores[index] = {
        title: this.getScoreLabelFromInteraction(interaction),
        raw: 0,
        max: maxScore,
        scaled: 0
      };

      sceneScoreCard.numQuestionsInScene += 1;
    });

    return sceneScoreCard;
  }

  /**
   * Get label from interaction.
   * @param {object} interaction Interaction.
   * @returns {string} Label for scorecard.
   */
  getScoreLabelFromInteraction(interaction) {
    return interaction.labelText ?
      interaction.labelText :
      interaction.action?.metadata?.title;
  }

  /**
   * @param {object} interaction Interaction.
   * @returns {number} Maximum score of interaction.
   */
  getQuestionMaxScore(interaction) {
    return this.context.extras.isEditor ?
      1 :
      interaction.instanceMaxScore ?? 0;
  }

  /**
   * Determine whether an interaction is scored (?).
   * @returns {boolean} True, if interaction is scored.
   */
  hasOneQuestion() {
    if (this.context.extras.isEditor || !this.context.params.scenes) {
      return false;
    }

    return this.context.params.scenes.some((scene) => {
      if (!scene.interactions) {
        return false;
      }

      return scene.interactions.some((interaction) => {
        return this.getQuestionMaxScore(interaction) > 0;
      });
    });
  }

  /**
   * Navigate to scene by id.
   * @param {number} sceneId Scene id.
   */
  navigateToScene(sceneId) {
    this.setState({
      sceneWaitingForLoad: this.props.currentScene,
      focusedInteraction: null,
      maxZoomedIn: false,
      maxZoomedOut: true,
      zoomScale: 1,
    });

    let nextSceneId = null;

    if (sceneId === SceneTypes.PREVIOUS_SCENE) {
      const history = [...this.state.sceneHistory];
      nextSceneId = history.pop();
      this.skipHistory = true;
      this.setState({
        sceneHistory: history,
      });
    }
    else {
      nextSceneId = this.context.params.scenes.find((scene) => {
        return scene.sceneId === sceneId;
      }).sceneId;
    }

    // Pause any playing interaction audio on navigation
    const isInteractionAudioPlaying =
      getAudioPlayerType(this.state.audioIsPlaying) === AUDIO_PLAYER_TYPES['interaction'];

    if (isInteractionAudioPlaying) {
      const lastPlayer = this.getAudioPlayer(this.state.audioIsPlaying);
      fadeAudioInAndOut(lastPlayer, null, true);
    }

    // Show scene description when scene starts for the first time, if specified
    this.handleSceneDescriptionInitially(nextSceneId);

    this.props.setCurrentSceneId(nextSceneId);
  }

  /**
   * Handle showing scene description when scene gets rendered.
   * Based on editor configuration.
   * @param {number} sceneId Scene id of scene that is displayed.
   */
  handleSceneDescriptionInitially(sceneId) {
    if (!this.state.scenesOpened.includes(sceneId)) {
      // Scene has not been opened before, find scene information
      const scene = this.context.params.scenes.find((scene) => {
        return scene.sceneId === sceneId;
      });

      if (scene.showSceneDescriptionInitially) {
        // Show scene description, since specified
        this.handleSceneDescription(scene.scenedescription);
      }

      // Add scene to list of opened scenes
      const newSceneOpened = this.state.scenesOpened;
      newSceneOpened.push(sceneId);

      this.setState({
        scenesOpened: newSceneOpened
      });
    }
  }

  /**
   * Show scene description.
   * @param {string} text Scene description
   */
  handleSceneDescription(text) {
    this.setState({
      showingTextDialog: true,
      currentText: text,
      nextFocus: null
    });
  }

  /**
   * Show score summary.
   */
  handleScoreSummary() {
    this.setState({
      showingScoreSummary: true,
      nextFocus: null
    });
  }

  /**
   * Close text dialog.
   */
  handleCloseTextDialog() {
    this.setState({
      showingTextDialog: false,
      showingScoreSummary: false,
      currentText: null,
      nextFocus: 'scene-description' // Should probably come in as an arg when opening the dialog
    });
  }

  /**
   * Get audio player for current track.
   * @param {string} id Id of audio player.
   * @param {object} [interaction] Parameters (Only needed initially).
   * @returns {HTMLAudioElement|undefined} Audio player or `null` if track isn't playable.
   */
  getAudioPlayer(id, interaction) {
    // Create player if none exist
    if (this.audioPlayers[id] === undefined) {
      const noTrackToPlay = !interaction?.action?.params?.files?.length;
      if (noTrackToPlay) {
        return; // No track to play
      }

      this.audioPlayers[id] = createAudioPlayer(
        this.context.contentId,
        interaction.action.params.files,
        () => {
          // Track started, set playing state
          this.setState({ audioIsPlaying: id });
        },
        () => {
          if (this.state.audioIsPlaying === id) {
            // Track ended, stop playing
            this.setState({ audioIsPlaying: null });
          }
        },
        () => {
          if (this.state.audioIsPlaying === id) {
            // Track ended, clear state
            this.setState({ audioIsPlaying: null });
          }
        },
        false
      );
    }

    return this.audioPlayers[id];
  }

  /**
   * Get interaction from current scene by index.
   * @param {number} interactionIndex Index of interaction to get.
   * @returns {object} Interaction.
   */
  getInteractionFromCurrentScene(interactionIndex) {
    const scene = this.context.params.scenes.find(
      (scene) => scene.sceneId === this.props.currentScene,
    );

    return scene.interactions[interactionIndex];
  }

  /**
   * Show interaction in current scene by index.
   * @param {number} interactionIndex Index of interaction to show.
   */
  showInteraction(interactionIndex) {
    const interaction = this.getInteractionFromCurrentScene(interactionIndex);
    const library = H5P.libraryFromString(interaction.action.library);
    const machineName = library.machineName;

    // Check if it has password and is unlocked
    if (interaction.passwordSettings?.interactionPassword && !interaction.unlocked) {
      this.setState({
        showingInteraction: true,
        currentInteraction: interactionIndex,
        showingPassword: true,
        nextFocus: null
      });
    }
    else if (machineName === 'H5P.GoToScene') {
      this.setState({
        currentInteraction: null,
      });

      const nextSceneId = parseInt(interaction.action.params.nextSceneId);
      this.navigateToScene(nextSceneId);
    }
    else if (machineName === 'H5P.Audio') {
      const playerId = `interaction-${this.props.currentScene}-${interactionIndex}`;

      if (this.state.audioIsPlaying === playerId) {
        // Pause and reset player
        const lastPlayer = this.getAudioPlayer(playerId);
        fadeAudioInAndOut(lastPlayer, null, true);
      }
      else {
        // Start current audio playback
        if (
          [AUDIO_PLAYER_TYPES['scene'], AUDIO_PLAYER_TYPES['playlist']]
            .includes(getAudioPlayerType(this.state.audioIsPlaying))
        ) {
          this.setState({
            sceneAudioWasPlaying: this.state.audioIsPlaying
          });
        }

        const player = this.getAudioPlayer(playerId, interaction);
        const lastPlayer =
          getAudioPlayerType(this.state.audioIsPlaying) === AUDIO_PLAYER_TYPES['interaction']
            ? this.getAudioPlayer(this.state.audioIsPlaying)
            : this.sceneAudioPlayers[this.state.audioIsPlaying];

        fadeAudioInAndOut(lastPlayer, player, false);
      }
    }
    else {
      // Show interaction in dialog by default
      this.setState({
        showingInteraction: true,
        currentInteraction: interactionIndex,
        showingPassword: false,
        nextFocus: null
      });

      // Save last scene player if any
      if (
        [AUDIO_PLAYER_TYPES['scene'], AUDIO_PLAYER_TYPES['playlist']]
          .includes(getAudioPlayerType(this.state.audioIsPlaying))
      ) {
        this.setState({
          sceneAudioWasPlaying: this.state.audioIsPlaying
        });
      }
    }
  }

  /**
   * Hide all interactions.
   */
  hideInteraction() {
    this.setState((prevState) => ({
      showingInteraction: false,
      currentInteraction: null,
      nextFocus: 'interaction-' + prevState.currentInteraction
    }));

    // Play scene audio again if it was played before this interaction
    if (!this.state.audioIsPlaying && this.state.sceneAudioWasPlaying) {
      const lastplayer = this.sceneAudioPlayers[this.state.sceneAudioWasPlaying];
      fadeAudioInAndOut(null, lastplayer, false);
    }
  }

  /**
   * Hide password dialog.
   */
  hidePasswordDialog() {
    this.setState((prevState) => ({
      showingPassword: false,
      currentInteraction: null,
      nextFocus: 'interaction-' + prevState.currentInteraction
    }));
  }

  /**
   * Add three sixty.
   * @param {object} threeSixty ThreeSixty instance.
   */
  addThreeSixty(threeSixty) {
    this.props.addThreeSixty(threeSixty);
    this.setState({
      threeSixty: threeSixty
    });
  }

  /**
   * Set player started.
   * @param {number} id Id of player that started playing.
   */
  handleAudioIsPlaying(id) {
    this.setState({
      audioIsPlaying: id // Change the player
    });
  }

  /**
   * Set player ended.
   * @param {number} id Id of player that stopped playing.
   */
  handleSceneAudioWasPlaying(id) {
    this.setState({
      sceneAudioWasPlaying: id // Set the prev player
    });
  }

  /**
   * Get scene's audio players.
   * @param {object} players Audio players.
   */
  getSceneAudioPlayers(players) {
    this.sceneAudioPlayers = players;
  }

  /**
   * Center view of current scene.
   */
  centerScene() {
    const scene = this.context.params.scenes.find((scene) => {
      return scene.sceneId === this.props.currentScene;
    });

    if (!scene) {
      return;
    }

    this.props.onSetCameraPos(scene.cameraStartPosition, true);
  }

  /**
   * Go to start scene.
   */
  goToStartScene() {
    this.navigateToScene(this.context.params.startSceneId);

    this.setState({
      startBtnClicked: true
    });
  }

  /**
   * Zoom in.
   * @param {SceneTypes} sceneType Scene type.
   * @param {string} eventType Event type.
   */
  onZoomIn(sceneType, eventType) {
    const isStaticScene = sceneType === SceneTypes.STATIC_SCENE;

    if (isStaticScene) {
      if (this.state.maxZoomedIn) {
        return;
      }

      const zoomFactor = this.getZoomFactor(eventType);
      const newZoomScale = Math.min(this.state.zoomScale + zoomFactor, Main.MAX_ZOOM);
      const newZoomPercentage = this.calculateZoomPercentage(newZoomScale);

      this.updateZoomState(newZoomScale, newZoomPercentage);
    }
    else {
      this.state.threeSixty.zoomControls.dollyIn();
    }
  }

  /**
   * Zoom out.
   * @param {SceneTypes} sceneType Scene type.
   * @param {string} eventType Event type.
   */
  onZoomOut(sceneType, eventType) {
    const isStaticScene = sceneType === SceneTypes.STATIC_SCENE;
    if (isStaticScene) {
      if (this.state.maxZoomedOut) {
        return;
      }

      const zoomFactor = this.getZoomFactor(eventType);
      const newZoomScale = Math.max(this.state.zoomScale - zoomFactor, Main.MIN_ZOOM);
      const newZoomPercentage = this.calculateZoomPercentage(newZoomScale);

      this.updateZoomState(newZoomScale, newZoomPercentage);
    }
    else {
      this.state.threeSixty.zoomControls.dollyOut();
    }
  }

  /**
   * Get zoom factor based on event type.
   * @param {string} eventType Event type.
   * @returns {number} Zoom factor.
   */
  getZoomFactor(eventType) {
    return eventType === 'touch' ? Main.ZOOM_FACTOR_TOUCH : Main.ZOOM_FACTOR;
  }

  /**
   * Calculate zoom percentage.
   * @param {number} zoomScale Zoom scale.
   * @returns {number} Zoom percentage.
   */
  calculateZoomPercentage(zoomScale) {
    return Math.round((zoomScale - Main.MIN_ZOOM) / (Main.MAX_ZOOM - Main.MIN_ZOOM) * 100);
  }

  /**
   * Calculate zoom scale.
   * @param {number} zoomPercentage Zoom percentage.
   * @returns {number} Zoom scale.
   */
  calculateZoomScale(zoomPercentage) {
    return (zoomPercentage / 100) * (Main.MAX_ZOOM - Main.MIN_ZOOM) + Main.MIN_ZOOM;
  }

  /**
   * Update zoom state.
   * @param {number} zoomScale Zoom scale.
   * @param {number} zoomPercentage Zoom percentage.
   */
  updateZoomState(zoomScale, zoomPercentage) {
    this.setState({
      zoomScale: zoomScale,
      zoomPercentage: zoomPercentage,
      maxZoomedIn: zoomScale >= Main.MAX_ZOOM,
      maxZoomedOut: zoomScale <= Main.MIN_ZOOM
    });
  }

  /**
   * Remove all scenes waiting to be loaded.
   */
  doneLoadingNextScene() {
    this.setState({
      sceneWaitingForLoad: null,
    });
  }

  /**
   * Update score card.
   * @param {number} sceneId Scene id.
   * @param {number} interactionId Interaction index.
   * @param {object} score Score card.
   */
  updateScoreCard(sceneId, interactionId, score) {
    const newState = { ... this.state };

    newState.scoreCard.totalQuestionsCompleted++;
    if (!this.state.scoreCard.sceneScoreCards[sceneId]) {
      newState.scoreCard[sceneId] = {};
    }
    newState.scoreCard.sceneScoreCards[sceneId].scores[interactionId] = score;

    this.setState(newState);

    const scene = this.context.params.scenes.find((scene) => {
      return scene.sceneId === sceneId;
    });

    scene.interactions[interactionId].isAnswered = true;
  }

  /**
   * Update escape score card.
   * @param {boolean} isUnlocked If true, unlocked. Else locked.
   */
  updateEscapeScoreCard(isUnlocked) {
    const totalCodesEntered = this.state.scoreCard.totalCodesEntered + 1;
    const totalCodesUnlocked = this.state.scoreCard.totalCodesUnlocked +
      (isUnlocked ? 1 : 0);

    this.setState({
      scoreCard: {
        ...this.state.scoreCard,
        totalCodesEntered,
        totalCodesUnlocked,
      }
    });
  }

  /**
   * Read text via aria live region.
   * @param {string} text Text to read.
   */
  read(text) {
    let newText = null;

    // Concatenate if there's text already
    if (this.state.readingText) {
      const lastChar = this.state.readingText
        .substring(this.state.readingText.length - 1);

      newText = [
        `${this.state.readingText}${lastChar === '.' ? '' : '.'}`,
        text
      ].join(' ');
    }
    else {
      newText = text;
    }

    this.setState({ readingText: newText });

    window.clearTimeout(Screenreader.timeout);
    Screenreader.timeout = window.setTimeout(() => {
      this.setState({ readingText: null });
    }, 100);
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    const sceneParams = this.context.params.scenes;
    if (!sceneParams?.length) {
      return <NoScene label={this.context.l10n.noContent} />;
    }

    const scene = sceneParams.find((scene) => {
      return scene.sceneId === this.props.currentScene;
    });
    if (!scene) {
      return null;
    }
    const isStartScene =
      this.props.currentScene === this.context.params.startSceneId;

    const isShowingInteraction = this.state.showingInteraction &&
      this.state.currentInteraction !== null;

    const currentInteraction = scene.interactions
      ?.[this.state.currentInteraction];

    let dialogClasses = [];
    if (currentInteraction && isShowingInteraction) {
      const library = H5P.libraryFromString(currentInteraction.action.library);
      const interactionClass = library.machineName
        .replace('.', '-')
        .toLowerCase();

      dialogClasses.push(interactionClass);
    }

    const showZoomButtons = scene.enableZoom;
    const showInteractionDialog = this.state.showingInteraction &&
      this.state.currentInteraction !== null;
    const showPasswordDialog = this.state.showingPassword &&
      this.state.currentInteraction !== null;
    const showTextDialog = this.state.showingTextDialog &&
      this.state.currentText;
    const showingScoreSummary = this.state.showingScoreSummary;
    // Whenever dialog is shown we need to hide all elements behind overlay
    const isHiddenBehindOverlay = (showInteractionDialog || showTextDialog);

    const sceneIcons = this.context.params.scenes.map((sceneParams) => {
      return {
        id: sceneParams.sceneId,
        iconType: sceneParams.iconType,
      };
    });

    return (
      <div
        role="document"
        aria-label={ this.context.l10n.title }
        id={ this.documentID }
      >
        { this.props.fullScreenSupported &&
          <FullscreenButton
            ariaLabel={this.props.fullscreenButtonAriaLabel}
            onClicked={this.props.onFullscreenClicked}
            tabIndex={isHiddenBehindOverlay ? '-1' : undefined}
          />
        }
        { showInteractionDialog && !showPasswordDialog &&
          <Dialog
            title={ currentInteraction.action.metadata.title }
            onHideTextDialog={this.hideInteraction.bind(this)}
            dialogClasses={dialogClasses}
            takeFocus={ this.isVeryFirstRenderDone }
            ariaRole={ 'dialog' }
          >
            <InteractionContent
              currentScene={this.props.currentScene}
              currentInteraction={this.state.currentInteraction}
              audioIsPlaying={this.state.audioIsPlaying}
              onAudioIsPlaying={this.handleAudioIsPlaying.bind(this)}
              updateScoreCard={this.updateScoreCard.bind(this)}
            />
          </Dialog>
        }

        { showInteractionDialog && showPasswordDialog &&
          <Dialog
            title={ this.context.l10n.lockedContent }
            onHideTextDialog={this.hideInteraction.bind(this)}
            dialogClasses={dialogClasses}
            takeFocus={ this.isVeryFirstRenderDone }
          >
            <PasswordContent
              read={this.read.bind(this)}
              showInteraction={this.showInteraction.bind(this)}
              currentInteractionIndex={this.state.currentInteraction}
              currentInteraction={currentInteraction}
              isInteractionUnlocked={currentInteraction.unlocked}
              hint={currentInteraction.passwordSettings.interactionPasswordHint}
              updateEscapeScoreCard={this.updateEscapeScoreCard.bind(this)}
            />
          </Dialog>
        }

        { showTextDialog &&
        <Dialog
          title={ this.context.l10n.sceneDescription }
          onHideTextDialog={ this.handleCloseTextDialog.bind(this) }
          takeFocus={ this.isVeryFirstRenderDone }
        >
          <div dangerouslySetInnerHTML={{ __html: this.state.currentText }} />
        </Dialog>
        }
        { showingScoreSummary &&
          <ScoreSummary
            title={this.context.l10n.scoreSummary}
            onHideTextDialog={ this.handleCloseTextDialog.bind(this) }
            scores={this.state.scoreCard}></ScoreSummary>

        }
        {
          this.context.params.scenes.map((sceneParams) => {
            return (
              <Scene
                wasConvertedFromVirtualTour={this.props.wasConvertedFromVirtualTour}
                zoomPercentage={this.state.zoomPercentage}
                key={sceneParams.sceneId}
                threeSixty={this.state.threeSixty}
                updateThreeSixty={this.state.updateThreeSixty}
                isActive={sceneParams.sceneId === this.props.currentScene}
                isHiddenBehindOverlay={ isHiddenBehindOverlay }
                sceneIcons={sceneIcons}
                sceneParams={sceneParams}
                nextFocus={ this.state.nextFocus }
                takeFocus={ this.isVeryFirstRenderDone && !showTextDialog }
                addThreeSixty={ this.addThreeSixty.bind(this) }
                imageSrc={sceneParams.scenesrc}
                navigateToScene={this.navigateToScene.bind(this)}
                forceStartCamera={this.props.forceStartCamera}
                showInteraction={this.showInteraction.bind(this)}
                sceneHistory={this.state.sceneHistory}
                audioIsPlaying={ this.state.audioIsPlaying }
                sceneId={sceneParams.sceneId}
                onSetCameraPos={ this.props.onSetCameraPos }
                onBlurInteraction={this.blurInteraction.bind(this)}
                onFocusedInteraction={this.setFocusedInteraction.bind(this)}
                focusedInteraction={this.state.focusedInteraction}
                isEditingInteraction={this.state.isEditingInteraction}
                sceneWaitingForLoad={this.state.sceneWaitingForLoad}
                doneLoadingNextScene={this.doneLoadingNextScene.bind(this)}
                startBtnClicked={this.state.startBtnClicked}
                read={ this.read.bind(this) }
                sceneDescriptionARIA={ sceneParams.sceneDescriptionARIA }
                setReactRoots={ (reactRoots) => {
                  this.reactRoots = reactRoots;
                } }
                getReactRoots={ () => this.reactRoots ?? [null, null] }
                zoomScale={ this.state.zoomScale }
                zoomIn={ this.onZoomIn.bind(this) }
                zoomOut={ this.onZoomOut.bind(this) }
                maxZoomedIn={ this.state.maxZoomedIn }
                maxZoomedOut={ this.state.maxZoomedOut }
                show360Affordance={ this.show360Affordance }
                on360AffordanceDone={ () => {
                  this.show360Affordance = false;
                } }
              />
            );
          })
        }
        <HUD
          scene={ scene }
          audioIsPlaying={ this.state.audioIsPlaying }
          sceneAudioWasPlaying={ this.state.sceneAudioWasPlaying }
          isHiddenBehindOverlay={ isHiddenBehindOverlay }
          nextFocus={ this.state.nextFocus }
          onAudioIsPlaying={ this.handleAudioIsPlaying.bind(this) }
          onSceneAudioWasPlaying={ this.handleSceneAudioWasPlaying.bind(this) }
          onSceneDescription={ this.handleSceneDescription.bind(this) }
          onCenterScene={ this.centerScene.bind(this) }
          isStartScene = {isStartScene}
          onGoToStartScene={ this.goToStartScene.bind(this) }
          onShowingScoreSummary={this.handleScoreSummary.bind(this)}
          showHomeButton={this.context.behavior.showHomeButton}
          showScoresButton={this.context.behavior.showScoresButton && this.hasOneQuestion()}
          updateSceneAudioPlayers={ this.getSceneAudioPlayers.bind(this) }
          interactionAudioPlayers={ this.audioPlayers }
          ariaControls={ this.documentID }
        />
        { showZoomButtons &&
          <ZoomButtons
            onZoomIn={ this.onZoomIn.bind(this, scene.sceneType) }
            onZoomOut={ this.onZoomOut.bind(this, scene.sceneType) }
            isHiddenBehindOverlay={ isHiddenBehindOverlay }
            isZoomInDisabled={ this.state.maxZoomedIn }
            isZoomOutDisabled={ this.state.maxZoomedOut }
            ariaControls={ this.documentID }
            zoomPercentage={ this.state.zoomPercentage }
          />
        }
        <Screenreader
          readText = { this.state.readingText }
        />
      </div>
    );
  }
}

Main.contextType = H5PContext;

/** @constant {number} ZOOM_FACTOR Zoom factor for static scene */
Main.ZOOM_FACTOR = 0.3;

/** @constant {number} ZOOM_FACTOR_TOUCH Zoom factor for static scene */
Main.ZOOM_FACTOR_TOUCH = 0.15;

/** @constant {number} MAX_ZOOM Maximum zoom level for statcic scene */
Main.MAX_ZOOM = 4;

/** @constant {number} MIN_ZOOM Minimum zoom level for static scene */
Main.MIN_ZOOM = 1;

Main.propTypes = {
  fullScreenSupported: PropTypes.bool.isRequired,
  fullscreenButtonAriaLabel: PropTypes.string.isRequired,
  onFullscreenClicked: PropTypes.func.isRequired,
  currentScene: PropTypes.number,
  setCurrentSceneId: PropTypes.func.isRequired,
  addThreeSixty: PropTypes.func.isRequired,
  onSetCameraPos: PropTypes.func.isRequired,
  forceStartCamera: PropTypes.bool,
  wasConvertedFromVirtualTour: PropTypes.bool,
  isVeryFirstRenderDone: PropTypes.bool
};
