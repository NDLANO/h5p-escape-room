import React from 'react';
import { createRoot } from 'react-dom/client';
import NavigationButton, { getIconFromInteraction, getLabelFromInteraction } from '../../Interactions/NavigationButton';
import { H5PContext } from '../../../context/H5PContext';
import ContextMenu from '../../Shared/ContextMenu';
import './ThreeSixtyScene.scss';
import OpenContent from '../../Interactions/OpenContent';
import { renderIn3d } from '../../../utils/utils';

export const sceneRenderingQualityMapping = {
  high: 128,
  medium: 64,
  low: 16,
};

/** @constant {number} AFFORDANCE_INTERVAL_DEFAULT_MS Default time in between affordance pointers. */
const AFFORDANCE_INTERVAL_DEFAULT_MS = 7500;

/** @constant {number} AFFORDANCE_INTERVAL_MIN_MS Minimum time in between affordance pointers. */
const AFFORDANCE_INTERVAL_MIN_MS = 1000;

export default class ThreeSixtyScene extends React.Component {
  /**
   * @param {object} props React properties.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.sceneRef = React.createRef();
    this.affordancePointerRef = React.createRef();
    this.renderedInteractions = 0;

    this.state = {
      imagePath: null, // Path of current loaded image
      isLoaded: false, // Has the image been loaded
      isUpdated: false, // Has the scene been updated
      isRendered: false, // Has the scene been drawn
      cameraPosition: null, // Store current camera position between scene changes
      pointerLockElement: null,
      willPointerLock: false,
      hasPointerLock: false,
    };

    this.handleFirstRender = this.handleFirstRender.bind(this);
    this.handleSceneMoveStart = this.handleSceneMoveStart.bind(this);
    this.handleSceneMove = this.handleSceneMove.bind(this);
    this.handleSceneMoveStop = this.handleSceneMoveStop.bind(this);

    this.terminateAffordance = this.terminateAffordance.bind(this);
  }

  /**
   * Lock dragged Navigation Button to the pointer.
   * @param {HTMLElement} element Dragged Navigation button DOM element.
   */
  initializePointerLock(element) {
    element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock;
    if (!element.requestPointerLock) {
      return;
    }

    this.setState({
      willPointerLock: true,
      pointerLockElement: element,
    });

    window.setTimeout(() => {
      this.setState({
        hasPointerLock: true,
      });
    }, 100);
  }

  /**
   * Unlock Navigation Button from pointer.
   */
  cancelPointerLock() {
    this.setState({
      willPointerLock: false,
      hasPointerLock: false,
    });
  }

  /**
   * Handle first render.
   */
  handleFirstRender() {
    this.setState({
      isRendered: true
    });

    if (this.props.show360Affordance) {
      this.registerAffordance();
    }

    this.focusScene();
  }

  /**
   * Register affordance.
   * @param {object} [params] Parameters.
   * @param {number} [params.intervalMs] Interval in milliseconds.
   * @param {boolean} [params.once] If true, run only once.
   */
  registerAffordance(params = {}) {
    if (typeof params.intervalMs !== 'number' || params.intervalMs < AFFORDANCE_INTERVAL_MIN_MS) {
      params.intervalMs = AFFORDANCE_INTERVAL_DEFAULT_MS;
    }

    window.clearTimeout(this.affordanceStartTimeout);
    this.affordanceStartTimeout = window.setInterval(() => {
      if (this.preAffordanceCameraPosition) {
        return; // Affordance already started
      }

      this.startAffordance({ once: params.once });
    }, params.intervalMs);

    document.addEventListener('click', this.terminateAffordance, { once: true });
    document.addEventListener('keydown', this.terminateAffordance, { once: true });
  }

  /**
   * Start affordance animation.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.once] If true, run only once.
   */
  startAffordance(params = {}) {
    params.once = params.once || false;

    this.preAffordanceCameraPosition = this.props.threeSixty.getCurrentPosition();
    this.affordanceCounter = 0;

    this.affordancePointerRef.current.classList.remove('display-none');

    this.affordanceAnimationTimeout = window.setInterval(() => {
      this.animateAffordance({ once: params.once });
    }, 25); // 40 fps
  }

  /**
   * Animate the affordance.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.once] If true, terminate after one animation.
   * @param {number} [params.displacementFactor] Displacement factor.
   */
  animateAffordance(params = {}) {
    params.displacementFactor = params.displacementFactor ?? 0.5;

    this.affordanceCounter += Math.PI / 45;

    if (this.affordanceCounter >= 2 * Math.PI) {
      if (params.once) {
        this.terminateAffordance();
      }
      else {
        this.stopAffordance();
      }

      return;
    }

    const translation = Math.sin(this.affordanceCounter) * params.displacementFactor;

    this.affordancePointerRef.current.style.translate = `${-10 * translation}%`;
    this.affordanceYaw = this.preAffordanceCameraPosition.yaw + translation / 10;

    // Setting this by updating state seems to be too slow
    this.props.threeSixty.setCameraPosition(this.affordanceYaw, this.preAffordanceCameraPosition.pitch);
  }

  /**
   * Stop affordance animation.
   */
  stopAffordance() {
    clearTimeout(this.affordanceAnimationTimeout);

    this.affordancePointerRef.current.classList.add('display-none');
    this.affordancePointerRef.current.style.translate = '';

    if (!this.preAffordanceCameraPosition) {
      return;
    }

    this.props.threeSixty.setCameraPosition(
      this.preAffordanceCameraPosition.yaw, this.preAffordanceCameraPosition.pitch
    );

    delete this.affordanceCounter;
    delete this.preAffordanceCameraPosition;
  }

  /**
   * Terminate affordance animation.
   */
  terminateAffordance() {
    window.clearTimeout(this.affordanceStartTimeout);
    this.stopAffordance();

    document.removeEventListener('click', this.terminateAffordance);
    document.removeEventListener('keydown', this.terminateAffordance);

    this.props.on360AffordanceDone?.();
  }

  /**
   * Handle dragging scene started.
   * @param {H5P.Event} event Event.
   * @returns {boolean|undefined} False, when dragging context menu or context menu children.
   */
  handleSceneMoveStart(event) {
    this.terminateAffordance();

    this.startPosition = this.props.threeSixty.getCurrentPosition();

    if (!this.context.extras.isEditor || event.data.isCamera) {
      return; // Not relevant.
    }

    const target = event.data.target;
    if (target) {
      const isOrIsInContextMenu = !!target.closest('.context-menu');

      // Don't move when dragging context menu or context menu children
      if (isOrIsInContextMenu || target.classList.contains('drag')) {
        event.defaultPrevented = true;
        return false;
      }

      const draggableWrapperClasses = [
        'nav-button-wrapper',
        'open-content-wrapper',
      ];
      const isDraggable = draggableWrapperClasses.some(
        (className) => !!target.closest(`.${className}`),
      );

      if (isDraggable) {
        const element = event.data.element;
        this.initializePointerLock(element);
      }
    }
  }

  /**
   * Handle dragging scene ongoing.
   */
  handleSceneMove() {
    if (this.context.extras.isEditor) {
      return;
    }

    // Consider to be dragging after moving beyond maximum slack.
    const endPosition = this.props.threeSixty.getCurrentPosition();
    const sceneIsDragging =
      Math.abs(endPosition.yaw - this.startPosition?.yaw ?? 0) > ThreeSixtyScene.MAX_YAW_DELTA ||
      Math.abs(endPosition.pitch - this.startPosition?.pitch ?? 0) > ThreeSixtyScene.MAX_PITCH_DELTA;

    this.setState({ sceneIsDragging: sceneIsDragging });
  }

  /**
   * Handle dragging scene ended.
   * @param {H5P.Event} event Event.
   */
  handleSceneMoveStop(event) {
    if (this.context.extras.isEditor) {
      this.cancelPointerLock();
    }

    window.requestAnimationFrame(() => {
      this.setState({ sceneIsDragging: false });
    });

    this.context.trigger('movestop', event.data);
  }

  /**
   * React life-cycle handler: Component will unmount.
   */
  componentWillUnmount() {
    if (!this.props.threeSixty) {
      return; // Was not set up properly.
    }

    // Remove handlers.
    this.props.threeSixty.stopRendering();
    this.props.threeSixty.off('movestart', this.handleSceneMoveStart);
    this.props.threeSixty.off('move', this.handleSceneMove);
    this.props.threeSixty.off('movestop', this.handleSceneMoveStop);
    this.props.threeSixty.off('firstrender', this.handleFirstRender);
  }

  /**
   * Initialize ThreeSixty.
   */
  initializeThreeSixty() {
    // Determine camera position
    let cameraPosition = this.state.cameraPosition;
    if (!cameraPosition || this.props.startBtnClicked) {
      const startPosition = this.props.sceneParams.cameraStartPosition
        .split(',')
        .map(parseFloat);

      cameraPosition = {
        yaw: startPosition[0],
        pitch: startPosition[1],
      };
    }

    let threeSixty;
    if (!this.props.threeSixty) {
      // ThreeSixty has not been used, yet. Create a new instance
      threeSixty = new H5P.NDLAThreeSixty(this.imageElement, {
        ratio: 16 / 9,
        cameraStartPosition: cameraPosition,
        segments: sceneRenderingQualityMapping[this.context.sceneRenderingQuality],
        isPanorama: this.props.isPanorama,
        enableZoom: this.props.enableZoom,
      });
      this.props.addThreeSixty(threeSixty);
    }
    else {
      // Set texture + camera pos
      threeSixty = this.props.threeSixty;
      threeSixty.setSourceElement(this.imageElement, this.props.isPanorama, this.props.enableZoom);
      threeSixty.setCameraPosition(cameraPosition.yaw, cameraPosition.pitch);
    }

    threeSixty.setAriaLabel(this.props.sceneParams.scenename);
    this.sceneRef.current.appendChild(threeSixty.getElement());
    threeSixty.resize(this.context.getRatio());

    // Show loading screen until first render has been drawn
    threeSixty.on('firstrender', this.handleFirstRender);

    threeSixty.startRendering();
    threeSixty.update();

    threeSixty.on('movestart', this.handleSceneMoveStart);
    threeSixty.on('move', this.handleSceneMove);
    threeSixty.on('movestop', this.handleSceneMoveStop);

    // Add buttons to scene
    this.addInteractionHotspots(threeSixty, this.props.sceneParams.interactions);
  }

  /**
   * Focus.
   */
  focusScene() {
    // Scene should only take focus if nothing else could
    if (this.props.takeFocus) {
      this.props.threeSixty?.focus();
    }
  }

  /**
   * Load current ThreeSixty scene.
   */
  loadScene() {
    if (!this.imageElement) {
      // Create image element used for loading on first load
      this.imageElement = document.createElement('img');
      this.imageElement.addEventListener('load', this.sceneLoaded.bind(this));
    }

    this.setState({
      imagePath: this.props.imageSrc !== undefined ? this.props.imageSrc.path : '',
      isRendered: false
    });

    if (H5P.setSource !== undefined) {
      H5P.setSource(this.imageElement, this.props.imageSrc, this.context.contentId);
    }
    else {
      const path = H5P.getPath(this.props.imageSrc.path, this.context.contentId);
      if (H5P.getCrossOrigin !== undefined) {
        const crossorigin = H5P.getCrossOrigin(path);
        if (crossorigin) {
          this.imageElement.setAttribute('crossorigin', crossorigin);
        }
      }
      this.imageElement.src = path;
    }
  }

  /**
   * Handle scene loaded.
   */
  sceneLoaded() {
    if (this.state.isLoaded && this.state.isUpdated && this.props.isActive) {
      // Has been loaded before, we only need to reload the texture
      this.props.threeSixty.update();
    }
    else {
      this.setState({
        isLoaded: true // Indicates that this.imageElement can now be used
      });
    }
  }

  /**
   * Create, add and render all interactions in 3D world.
   * @param {object} threeSixty ThreeSixty object.
   * @param {object[]} interactions Interactions.
   */
  addInteractionHotspots(threeSixty, interactions) {
    const list = interactions ?
      interactions.map((interaction, index) => this.createInteraction(interaction, index))
      : [];
    const components2d = [];
    const components3d = [];

    for (const interaction of list) {
      if (interaction.is3d) {
        components3d.push(interaction.component);
      }
      else {
        components2d.push(interaction.component);
      }
    }

    this.renderedInteractions = list.length;

    let [reactRoot2D, reactRoot3D] = this.props.getReactRoots();
    const [rendererElement2d, rendererElement3d] = threeSixty.getRenderers();
    if (!reactRoot2D || !reactRoot3D) {
      reactRoot2D = createRoot(rendererElement2d);
      reactRoot3D = createRoot(rendererElement3d.firstChild);

      this.props.setReactRoots([reactRoot2D, reactRoot3D]);
    }

    reactRoot2D.render(
      <H5PContext.Provider value={this.context}>
        { components2d }
      </H5PContext.Provider>
    );

    /*
     * In contrast to React 16, React 18 we need to render the react2D root
     * first before the react3D root can be rendered, as the latter is a child
     * of the former (why by the way?) and would overruled by rendering the 2D
     * root at the same time.
     */
    window.requestAnimationFrame(() => {
      // Workaround for reactRoot2D.render overwriting rendererElement3d
      const elements2d = [...rendererElement2d.childNodes];
      if (!elements2d.includes(rendererElement3d)) {
        rendererElement2d.insertBefore(rendererElement3d, elements2d[0]);
      }

      reactRoot3D.render(
        <H5PContext.Provider value={this.context}>
          { components3d }
        </H5PContext.Provider>
      );
    });
  }

  /**
   * Create button for each interaction.
   * @param {object} interaction Interaction.
   * @param {number} index Interaction index.
   * @returns {object} Interaction.
   */
  createInteraction(interaction, index) {
    const className = ['three-sixty'];

    if (
      this.props.audioIsPlaying === `interaction-${this.props.sceneId}-${index}`
    ) {
      className.push('active');
    }

    const isGoToSceneInteraction =
      H5P.libraryFromString(interaction.action.library)?.machineName === 'H5P.GoToScene';
    const title = this.props.getInteractionTitle(interaction.action);

    const onMount = (element) => {
      element.dataset.interactionId = interaction.id;

      this.props.threeSixty.add(
        element,
        ThreeSixtyScene.getPositionFromString(interaction.interactionpos),
        this.context.extras.isEditor
      );
    };

    const onUnmount = (element) => {
      this.props.threeSixty.remove(this.props.threeSixty.find(element));
    };

    const onUpdate = (element) => {
      const threeElement = this.props.threeSixty.find(element);

      H5P.NDLAThreeSixty.setElementPosition(
        threeElement,
        ThreeSixtyScene.getPositionFromString(interaction.interactionpos)
      );
    };

    const key = interaction.id || `interaction-${this.props.sceneId}${index}`;

    const is3d = renderIn3d(interaction);

    const component = (
      interaction.showAsOpenSceneContent ?
        <OpenContent
          key={key}
          mouseDownHandler={null}
          staticScene={false}
          sceneId={this.props.sceneId}
          leftPosition={null}
          topPosition={null}
          interactionIndex={index}
          onMount={onMount}
          onUnmount={onUnmount}
          onUpdate={onUpdate}
          doubleClickHandler={() => {
            this.context.trigger('doubleClickedInteraction', index);
          }}
          onFocus={ () => {
            this.handleInteractionFocus(interaction);
          }}
          ariaLabel={null}
          isFocused={this.props.focusedInteraction === index}
          onBlur={this.props.onBlurInteraction}
          is3DScene={true}
          is3d={is3d}
          isPanorama={this.props.isPanorama}
        >
          {
            this.context.extras.isEditor &&
            <ContextMenu
              isGoToScene={isGoToSceneInteraction}
              interactionIndex={index}
            />
          }
        </OpenContent>
        :
        <NavigationButton
          key={key}
          sceneIsDragging={this.state.sceneIsDragging}
          staticScene={false}
          leftPosition={null}
          topPosition={null}
          forceClickHandler={false}
          wrapperHeight={null}
          mouseDownHandler={null}
          onMount={onMount}
          onUnmount={onUnmount}
          onUpdate={onUpdate}
          title={title}
          label={getLabelFromInteraction(interaction)}
          buttonClasses={ className }
          icon={getIconFromInteraction(interaction, this.context.params.scenes)}
          isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
          nextFocus={ this.props.nextFocus }
          type={ 'interaction-' + index }
          clickHandler={() => {
            this.handleNavButtonClick(index);
          }
          }
          doubleClickHandler={() => {
            this.context.trigger('doubleClickedInteraction', index);
          }}
          onFocus={ () => {
            this.handleInteractionFocus(interaction);
          }}
          onFocusedInteraction={this.props.onFocusedInteraction.bind(this, index)}
          onBlur={this.props.onBlurInteraction}
          isFocused={this.props.focusedInteraction === index}
          rendered={this.state.isUpdated}
          showAsHotspot={interaction.showAsHotspot}
          showHotspotOnHover={interaction.hotspotSettings?.showHotspotOnHover}
          isHotspotTabbable={interaction.hotspotSettings?.isHotspotTabbable}
          sceneId = {this.props.sceneId}
          interactionIndex = {index}
          is3d={is3d}
          onGeometryChanged={() => {}}
        >
          {
            this.context.extras.isEditor &&
          <ContextMenu
            isGoToScene={isGoToSceneInteraction}
            interactionIndex={index}
          />
          }
        </NavigationButton>
    );

    return {
      component,
      is3d,
    };
  }

  /**
   * Convert params position string to object.
   * @param {string} position Position as `yaw.pitch`.
   * @returns {object} Camera position.
   */
  static getPositionFromString(position) {
    const [yaw, pitch] = position.split(',').map((strValue) => Number.parseFloat(strValue));

    return {
      yaw,
      pitch,
    };
  }

  /**
   * Handle click on navigation button.
   * @param {number} index Index of interaction linked to navigation button.
   */
  handleNavButtonClick(index) {
    this.props.showInteraction.bind(this)(index);
  }

  /**
   * Handle interaction focused.
   * @param {object} interaction Interaction.
   */
  handleInteractionFocus(interaction) {
    this.props.onSetCameraPos(interaction.interactionpos);
  }

  /**
   * React handler. Component did mount.
   */
  componentDidMount() {
    // Only load scene if image exists
    if (this.props.imageSrc !== undefined) {
      this.loadScene();
    }

    this.context.on('doubleClickedInteraction', () => {
      this.cancelPointerLock();
    });
  }

  /**
   * React handler: Component did mount.
   * @param {object} prevProps Properties before update.
   */
  componentDidUpdate(prevProps) {
    if (
      (this.props.isActive && this.state.isLoaded && !this.state.isUpdated) ||
      (this.props.isActive && this.props.updateThreeSixty) ||
      (this.props.isActive && prevProps.isPanorama !== this.props.isPanorama)
    ) {
      // Active and loaded, prepare the scene
      window.setTimeout(() => {
        this.initializeThreeSixty();
      }, 40); // Using timeout to allow loading screen to render before we load WebGL. TODO: Is there no callback?

      this.setState({
        isUpdated: true
      });
    }

    // Only load scene if image exists
    if (this.props.imageSrc !== undefined) {
      if (this.state.imagePath !== this.props.imageSrc.path) {
        this.loadScene();
      }
    }

    if (prevProps.isActive && !this.props.isActive) {
      // No longer active, indicate that scene must be updated
      this.props.threeSixty.stopRendering();
      this.props.threeSixty.off('movestart', this.handleSceneMoveStart);
      this.props.threeSixty.off('move', this.handleSceneMove);
      this.props.threeSixty.off('movestop', this.handleSceneMoveStop);
      this.props.threeSixty.off('firstrender', this.handleFirstRender);
      this.setState({
        cameraPosition: this.props.threeSixty.getCurrentPosition(),
        isUpdated: false,
        isRendered: false
      });
    }

    if (this.state.hasPointerLock) {
      if (!this.state.willPointerLock) {
        // canceled
        this.setState({
          willPointerLock: false,
          hasPointerLock: false,
        });
      }
      else {
        this.state.pointerLockElement.requestPointerLock();
        this.state.pointerLockElement.classList.add('dragging');
      }
    }
    else {
      document.exitPointerLock = document.exitPointerLock
        || document.mozExitPointerLock;
      if (document.exitPointerLock) {
        if (this.state.pointerLockElement) {
          this.state.pointerLockElement.classList.remove('dragging');
        }
        document.exitPointerLock();
      }
    }

    // Need to respond to dialog toggling in order to hide the buttons under the overlay
    const isHiddenBehindOverlayHasChanged = (this.props.isHiddenBehindOverlay !== prevProps.isHiddenBehindOverlay);
    if (isHiddenBehindOverlayHasChanged && this.state.isUpdated) {
      this.props.threeSixty.setTabIndex(false);
    }

    if (this.props.threeSixty && this.props.isActive) {
      // Need to respond to audio in order to update the icon of the interaction
      const audioHasChanged = (prevProps.audioIsPlaying !== this.props.audioIsPlaying);
      const hasChangedFocus = prevProps.focusedInteraction
        !== this.props.focusedInteraction;

      const hasChangedInteractions = this.props.sceneParams.interactions
        && (this.renderedInteractions
          !== this.props.sceneParams.interactions.length);

      let shouldUpdateInteractionHotspots = hasChangedInteractions
          || audioHasChanged
          || hasChangedFocus
          || isHiddenBehindOverlayHasChanged
          || this.props.isEditingInteraction;

      this.addInteractionHotspots(
        this.props.threeSixty, this.props.sceneParams.interactions
      );

      if (shouldUpdateInteractionHotspots) {
        this.addInteractionHotspots(
          this.props.threeSixty, this.props.sceneParams.interactions
        );
      }
      // Check if the scene that interactions point to has changed icon type
      // This is only relevant when changing the icon using the H5P editor
      else if (window.H5PEditor && this.props.sceneParams.interactions) {
        shouldUpdateInteractionHotspots = this.props.sceneParams.interactions.some((interaction) => {
          const library = H5P.libraryFromString(interaction.action.library);
          const machineName = library.machineName;
          if (machineName === 'H5P.GoToScene') {
            const nextSceneId = interaction.action.params.nextSceneId;
            const nextSceneIcon = this.props.sceneIcons.find((scene) => {
              return scene.id === nextSceneId;
            });
            const oldNextSceneIcon = prevProps.sceneIcons.find((scene) => {
              return scene.id === nextSceneId;
            });

            const hasChangedIcon = nextSceneIcon
              && oldNextSceneIcon
              && nextSceneIcon.iconType !== oldNextSceneIcon.iconType;
            if (hasChangedIcon) {
              return true;
            }
          }
          return false;
        });
      }
    }
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    if (!this.props.isActive) {
      return null;
    }

    return (
      <div
        style={{ '--zoom-percentage': this.props.zoomPercentage }}
        className='three-sixty-scene-wrapper'>
        <div
          ref={this.sceneRef}
          aria-hidden={ this.props.isHiddenBehindOverlay ? true : undefined }
        />
        {
          (!this.state.isRendered) &&
          <div className='loading-overlay'>
            <div className='loading-wrapper'>
              <div className='loading-image-wrapper'>
                <div className='loading-image'></div>
              </div>
              <div className='loader' dangerouslySetInnerHTML={{ __html: this.context.l10n.backgroundLoading }}></div>
            </div>
          </div>
        }
        <div
          ref={this.affordancePointerRef}
          className="affordance-pointer display-none"
        >
        </div>
      </div>
    );
  }
}

ThreeSixtyScene.contextType = H5PContext;

/** @constant {number} MAX_YAW_DELTA Maximum yaw delta allowed to distinguish click from drag. */
ThreeSixtyScene.MAX_YAW_DELTA = 0.005;

/** @constant {number} MAX_PITCH_DELTA Maximum pitch delta allowed to distinguish click from drag. */
ThreeSixtyScene.MAX_PITCH_DELTA = 0.01;
