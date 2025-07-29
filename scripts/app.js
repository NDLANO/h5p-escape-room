import React from 'react';
import { createRoot } from 'react-dom/client';
import Main from './components/Main';
import { H5PContext } from './context/H5PContext';
import { sceneRenderingQualityMapping } from './components/Scene/SceneTypes/ThreeSixtyScene';
import { sanitizeContentTypeParameters } from './utils/sanitization.js';
import MessageBox from './components/MessageBox/MessageBox';

export default class Wrapper extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('escape-room');

    this.params = sanitizeContentTypeParameters(params);

    this.contentId = contentId;
    this.extras = extras;

    this.isEditor = extras.isEditor;

    this.enforcedStartSceneId = extras.forceStartScreen >= 0 || null;
    this.forceStartCamera = extras.forceStartCamera ?? null;

    this.l10n = this.params.l10n;
    this.behavior = this.params.behaviour;

    // Parameters has been wrapped in the threeImage widget group
    this.params = this.params.threeImage;

    this.initializeInteractionMaxScores();

    this.isFullScreenSupported = this.isRoot() && H5P.fullscreenSupported;
    if (this.isFullScreenSupported) {
      this.fullscreenButtonAriaLabel = this.l10n.buttonFullscreenEnter;
      this.on('enterFullScreen', () => {
        window.setTimeout(() => {
          this.render();
        }, 50);
      });

      this.on('exitFullScreen', () => {
        window.setTimeout(() => {
          this.render();
          this.trigger('resize');
        }, 50);
      });
    }

    this.on('resize', () => {
      this.resize();
    });
  }

  /**
   * Resize app.
   */
  resize() {
    const rect = this.getRect();
    // Fullscreen should use all of the space
    const isStandaloneFullscreen = H5P.isFullscreen && this.isRoot();

    const ratio = isStandaloneFullscreen ?
      (rect.height / rect.width) :
      (9 / 16);

    this.wrapper.style.height = isStandaloneFullscreen ?
      '100%' :
      `${rect.width * ratio}px`;

    // Apply separate styles for mobile
    if (rect.width <= 480) {
      this.wrapper.classList.add('h5p-phone-size');
    }
    else {
      this.wrapper.classList.remove('h5p-phone-size');
    }
    if (rect.width < 768) {
      this.wrapper.classList.add('h5p-medium-tablet-size');
    }
    else {
      this.wrapper.classList.remove('h5p-medium-tablet-size');
    }

    // Resize scene
    if (this.currentSceneId === null || !this.threeSixty) {
      return;
    }

    const updatedRect = this.wrapper.getBoundingClientRect();
    this.threeSixty.resize(updatedRect.width / updatedRect.height);
  }

  /**
   * Add threeSixty instance.
   * @param {object} threeSixty ThreeSixty instance.
   */
  addThreeSixty(threeSixty) {
    this.threeSixty = threeSixty;

    this.setSceneRenderingQuality(
      this.behavior.sceneRenderingQuality || 'high'
    );
  }

  /**
   * Render app.
   */
  render() {
    this.root = this.root ?? createRoot(this.wrapper);
    this.root.render(
      <H5PContext.Provider value={this}>
        <Main
          wasConvertedFromVirtualTour={this.params.wasConvertedFromVirtualTour}
          forceStartScreen={this.enforcedStartSceneId}
          forceStartCamera={this.forceStartCamera}
          currentScene={this.currentSceneId}
          setCurrentSceneId={this.setCurrentSceneId.bind(this)}
          addThreeSixty={this.addThreeSixty.bind(this)}
          onSetCameraPos={this.setCameraPosition.bind(this)}
          isVeryFirstRender={!this.isAttached}
          fullScreenSupported={this.isFullScreenSupported}
          fullscreenButtonAriaLabel={this.fullscreenButtonAriaLabel}
          onFullscreenClicked={this.toggleFullscreen.bind(this)}
        />
      </H5PContext.Provider>
    );

    window.requestAnimationFrame(() => {
      this.trigger('resize');
    });
  }

  /**
   * Set current scene id.
   * @param {number} sceneId Scene id.
   */
  setCurrentSceneId(sceneId) {
    this.currentSceneId = sceneId;
    this.trigger('changedScene', sceneId);
    this.render();
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $container Content's container.
   */
  attach($container) {
    this.container = $container.get(0);

    const createElements = () => {
      this.wrapper = document.createElement('div');
      this.wrapper.classList.add('h5p-three-sixty-wrapper');

      if (this.params.scenes.length) {
        this.currentSceneId = this.params.startSceneId;
        if (this.enforcedStartSceneId) {
          this.currentSceneId = this.enforcedStartSceneId;
        }

        this.render();
      }
      else {
        const messageBox = new MessageBox({
          text: this.l10n.noValidScenesSet
        });
        this.wrapper.append(messageBox.getDOM());
      }

      this.isAttached = true;
    };

    /*
     * Temporary (fingers crossed) hotfix for Firefox on Edlib.
     * When overflow is set to `hidden` on Edlib (Why? H5P resizes the iframe
     * that the document lives in), then Firefox will not detect hotspots
     * as hovered/being clickable. Even with the `overflow` setting removed,
     * Firefox does require hotspots to be quite centered. When close to the
     * visible border of the scene, Firefox does not consider the hotspots
     * to be hovered/clicked.
     */
    document.body.style.overflow = '';

    if (!this.wrapper) {
      createElements();
    }

    // Append elements to DOM
    $container[0].appendChild(this.wrapper);
    $container[0].classList.add('h5p-three-image');
  }

  /**
   * Toggle fullscreen button.
   * @param {string|boolean} state enter|false for enter, exit|true for exit.
   */
  toggleFullscreen(state) {
    if (!this.container) {
      return;
    }

    if (typeof state === 'string') {
      if (state === 'enter') {
        state = false;
      }
      else if (state === 'exit') {
        state = true;
      }
    }

    if (typeof state !== 'boolean') {
      state = !H5P.isFullscreen;
    }

    if (state) {
      this.fullscreenButtonAriaLabel = this.l10n.buttonFullscreenExit;
      H5P.fullScreen(H5P.jQuery(this.container), this);
    }
    else {
      this.fullscreenButtonAriaLabel = this.l10n.buttonFullscreenEnter;
      H5P.exitFullScreen();
    }
  }

  /**
   * Get informaton about size/position of wrapper relative to viewport.
   * @returns {DOMRect} Informaton about size/position of wrapper.
   */
  getRect() {
    return this.wrapper.getBoundingClientRect();
  }

  /**
   * Get current size ratio of wrapper.
   * @returns {number} Current size ratio of wrapper.
   */
  getRatio() {
    const rect = this.wrapper.getBoundingClientRect();
    return (rect.width / rect.height);
  }

  /**
   * Compute max scores of interactions.
   * Done on creating main instance, because components need to know right from
   * the start whether there's at least one scored instance and subcontent
   * instances are only created on demand later on.
   */
  initializeInteractionMaxScores() {
    this.params.scenes = this.params.scenes.map((scene) => {
      if (!scene.interactions) {
        return scene;
      }

      scene.interactions = scene.interactions.map((interaction) => {
        if (this.isEditor) {
          interaction.instanceMaxScore = 0;
          return interaction;
        }

        const instance = H5P.newRunnable(
          interaction.action,
          this.contentId,
          // Some content types assume to be attached to some DOM immediately
          H5P.jQuery(document.createElement('div'))
        );
        interaction.instanceMaxScore = instance?.getMaxScore?.() ?? 0;

        return interaction;
      });

      return scene;
    });
  }

  /**
   * Set camera position.
   * @param {string} cameraPosition Camera position as `yaw,pitch` where yaw/pitch are floats.
   * @param {boolean} focus If true, set focus to scene after setting position.
   */
  setCameraPosition(cameraPosition, focus) {
    if (this.currentSceneId === null || !this.threeSixty) {
      return; // No scene available to set camera position for.
    }

    const [yaw, pitch] = cameraPosition.split(',');
    this.threeSixty.setCameraPosition(parseFloat(yaw), parseFloat(pitch));

    if (focus) {
      this.threeSixty.focus();
    }
  }

  /**
   * Get camera position and field of view.
   * @returns {object|undefined} Camera position and field of view.
   */
  getCamera() {
    if (this.currentSceneId === null || !this.threeSixty) {
      return; // No scene available to get information for.
    }

    return {
      camera: this.threeSixty.getCurrentPosition(),
      fov: this.threeSixty.getCurrentFov(),
    };
  }

  /**
   * Set rendering quality of scene.
   * @param {string} quality Quality as defined in semantics [high|medium|low].
   */
  setSceneRenderingQuality(quality) {
    const segments = sceneRenderingQualityMapping[quality];
    this.threeSixty?.setSegmentNumber(segments);
    this.sceneRenderingQuality = quality;
  }
}
