import React from 'react';
import './StaticScene.scss';
import NavigationButton, { getIconFromInteraction, getLabelFromInteraction, Icons } from '../../Interactions/NavigationButton';
import { H5PContext } from '../../../context/H5PContext';
import { SceneTypes } from '../Scene';
import ContextMenu from '../../Shared/ContextMenu';
import OpenContent from '../../Interactions/OpenContent';
export let staticSceneWidth, staticSceneHeight;

export default class StaticScene extends React.Component {
  /**
   * @class
   * @param {object} props React properties.
   */
  constructor(props) {
    super(props);

    this.sceneWrapperRef = React.createRef();
    this.imageElementRef = React.createRef();
    this.overLayRef = React.createRef();

    this.state = {
      x: null,
      y: null,
      draggingInteractionIndex: null,
      isDragDelayed: true,
      draggingElement: null,
      isVerticalImage: false,
    };

    this.onMove = this.onMove.bind(this);
    this.stoppedDragging = this.stoppedDragging.bind(this);
    this.resizeScene = this.resizeScene.bind(this);
  }

  /**
   * React life-cycle handler: Component did mount.
   */
  componentDidMount() {
    // Initialize resize logic
    this.context.on('resize', this.resizeScene);
    this.resizeScene();

    if (this.props.isActive && this.props.sceneWaitingForLoad !== null) {
      // Let main know that scene is finished loading
      this.props.doneLoadingNextScene();
    }
  }

  /**
   * React life-cycle handler: Component will be unmounted.
   */
  componentWillUnmount() {
    this.context.off('resize', this.resizeScene);
  }

  /**
   * React life-cycle handler: Component did update.
   */
  componentDidUpdate() {
    if (this.props.isActive && this.props.sceneWaitingForLoad !== null) {
      // Let main know that scene is finished loading
      this.props.doneLoadingNextScene();
    }

    // Specific to Firefox - Interaction buttons are moving out of scope when image is potrait
    if (this.sceneWrapperRef.current !== null
      && this.sceneWrapperRef.current.clientWidth !== this.imageElementRef.current.clientWidth
      && this.imageElementRef.current.clientWidth > 0) {
      this.sceneWrapperRef.current.style.width = `${this.imageElementRef.current.clientWidth}px`;
    }
  }

  /**
   * Resize scene.
   */
  resizeScene() {
    if (!this.sceneWrapperRef || !this.sceneWrapperRef.current) {
      return;
    }

    this.setStatisSceneSize();

    const wrapper = this.sceneWrapperRef.current;
    const wrapperSize = wrapper.getBoundingClientRect();
    const defaultSize = 938;
    const defaultFontSize = 16;
    this.sceneWrapperRef.current.style.width = '100%';

    // Specific to Firefox - Interaction buttons are moving out of scope when image is potrait
    if (this.imageElementRef.current.clientWidth > 0) {
      this.sceneWrapperRef.current.style.width = `${this.imageElementRef.current.clientWidth}px`;
    }

    // Only make icons smaller if necessary
    if (wrapperSize.width > defaultSize) {
      const currentFontSize = wrapper.style.fontSize;
      if (parseFloat(currentFontSize) !== defaultFontSize) {
        this.sceneWrapperRef.current.style.fontSize = `${defaultFontSize}px`;
        this.forceUpdate();
      }
      return;
    }

    const widthDiff = defaultSize - wrapperSize.width;
    const newFontSize = Math.max(
      StaticScene.FONT_SIZE_MIN_PX,
      defaultFontSize - (widthDiff / StaticScene.FONT_INCREMENT_THRESHOLD)
    );

    this.sceneWrapperRef.current.style.fontSize = `${newFontSize}px`;
    this.forceUpdate();
  }

  /**
   * Get wrapper size.
   * @param {boolean} [isVertical] True indicates vertical dragging.
   * @returns {number|undefined} Wrapper height for vertical movement, else width.
   */
  getWrapperSize(isVertical = false) {
    let wrapper = this.sceneWrapperRef.current;
    if (wrapper) {
      return isVertical ? wrapper.clientHeight : wrapper.clientWidth;
    }
  }

  /**
   * Get interaction being dragged.
   * @returns {object|false} Interaction being dragged or false.
   */
  getDraggingInteraction() {
    if (this.state.draggingInteractionIndex === null) {
      return false;
    }

    const interactions = this.props.sceneParams.interactions;
    return interactions[this.state.draggingInteractionIndex];
  }

  /**
   * Get percentage of mouse movement.
   * @param {PointerEvent} event Mouse event.
   * @param {boolean} [isVertical] True for vertical mouse movement.
   * @returns {number} Percentage of mouse movement.
   */
  getMouseMovedPercentages(event, isVertical = false) {
    const startPos = isVertical ? this.startY : this.startX;
    const mousePos = isVertical ? event.clientY : event.clientX;
    const wrapperSize = this.getWrapperSize(isVertical);

    return ((startPos - mousePos) / wrapperSize) * 100;
  }

  /**
   * Get position value without percent symbol.
   * @param {string} position Position string with percentage symbol.
   * @returns {string|false} Position value without percent symbol or false.
   */
  removePercentageDenotationFromPosition(position) {
    const lastChar = position.charAt(position.length - 1);

    return (lastChar === '%') ?
      position.substring(0, position.length - 1) :
      false;
  }

  /**
   * Get positions.
   * @param {string} positions Positions values delimited by a comma.
   * @returns {object} Position values as x and y.
   */
  getPositions(positions) {
    const pos = positions.split(',');
    return {
      x: pos[0],
      y: pos[1],
    };
  }

  /**
   * Get new interaction position.
   * @param {object} initialPos Position as object with x and y.
   * @param {PointerEvent} event Event.
   * @param {HTMLElement} element Element to move.
   * @param {boolean} isVertical True if movement was vertical.
   * @returns {number} New position.
   */
  getNewInteractionPosition(initialPos, event, element, isVertical = false) {
    let position = isVertical ? initialPos.y : initialPos.x;
    let mouseMoved = this.getMouseMovedPercentages(event, isVertical);
    let wrapperSize = this.getWrapperSize(isVertical);

    position = this.removePercentageDenotationFromPosition(position);
    const movedTo = position - mouseMoved;

    if (movedTo < 0) {
      return 0;
    }

    const elementBounds = element.getBoundingClientRect();
    const elementSize = isVertical ? elementBounds.height : elementBounds.width;
    const elementSizePercentage = (elementSize / wrapperSize) * 100;
    const positionThreshold = 100 - elementSizePercentage;

    return Math.min(movedTo, positionThreshold);
  }

  /**
   * Get new interaction position for both x and y coordinates.
   * @param {PointerEvent} event Event.
   * @returns {object} New positions.
   */
  getNewInteractionPositions(event) {
    const interaction = this.getDraggingInteraction();
    const initialPos = this.getPositions(interaction.interactionpos);

    const xPos = this.getNewInteractionPosition(
      initialPos,
      event,
      this.state.draggingElement,
    );

    const yPos = this.getNewInteractionPosition(
      initialPos,
      event,
      this.state.draggingElement,
      true,
    );

    return {
      x: xPos,
      y: yPos,
    };
  }

  /**
   * Start dragging.
   * @param {number} interactionIndex Index of interaction.
   * @param {PointerEvent} event Event.
   */
  startDragging(interactionIndex, event) {
    if (event.button !== 0) {
      return;
    }

    this.startX = event.clientX;
    this.startY = event.clientY;

    window.addEventListener('mousemove', this.onMove);
    window.addEventListener('mouseup', this.stoppedDragging);

    this.setState({
      draggingInteractionIndex: interactionIndex,
      draggingElement: event.target,
      isDragDelayed: true,
    });

    // Small delay to not accidentally drag interactions when double clicking
    window.setTimeout(() => {
      this.setState({ isDragDelayed: false });
    }, 50);
  }

  /**
   * Handle dragging movement.
   * @param {PointerEvent} event Event.
   */
  onMove(event) {
    const isDragging = this.state.draggingInteractionIndex !== null;
    const isDragDelayed = this.state.isDragDelayed;
    if (!isDragging || isDragDelayed) {
      return;
    }

    this.setState(this.getNewInteractionPositions(event));
  }

  /**
   * Handle dragging stopped.
   */
  stoppedDragging() {
    if (this.state.draggingInteractionIndex === null) {
      return;
    }

    window.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('mouseup', this.stoppedDragging);

    // State has not been updated, most likely a double-click
    if (this.state.x === null || this.state.y === null) {
      this.setState({
        x: null,
        y: null,
        draggingInteractionIndex: null,
        draggingElement: null,
        isDragDelayed: true,
      });

      return;
    }

    const interaction = this.getDraggingInteraction();
    interaction.interactionpos = `${this.state.x}%,${this.state.y}%`;

    this.setState({
      x: null,
      y: null,
      draggingInteractionIndex: null,
      draggingElement: null,
      isDragDelayed: true,
    });
  }

  /**
   * Go to previous scene.
   */
  goToPreviousScene() {
    if (this.props.sceneHistory.length > 0) {
      this.props.navigateToScene(SceneTypes.PREVIOUS_SCENE);
    }
  }

  /**
   * Handle scene loaded.
   */
  onSceneLoaded() {
    const imageElement = this.imageElementRef.current;
    const ratio = imageElement.naturalWidth / imageElement.naturalHeight;
    this.setState({ isVerticalImage: ratio < this.context.getRatio() });

    this.focusScene();

    this.resizeScene();
  }

  /**
   * Set static scene size.
   */
  setStatisSceneSize() {
    const imageElement = this.imageElementRef.current;
    if (!imageElement) {
      return;
    }

    const ratio = imageElement.naturalWidth / imageElement.naturalHeight;

    staticSceneWidth = imageElement.clientWidth;
    staticSceneHeight = imageElement.clientHeight;

    this.setState({
      isVerticalImage: ratio < this.context.getRatio(),
    });
  }

  /**
   * Focus scene.
   */
  focusScene() {
    // Scene should only take focus if nothing else could
    if (this.props.takeFocus) {
      this.imageElementRef.current?.focus();
    }
  }

  /**
   * Get interaction title.
   * @param {object} action Action.
   * @returns {string} Title.
   */
  getInteractionTitle(action) {
    const currentTitle = action.metadata.title;
    // TODO: Does this work internationally? Also: Same in static scene => move to Scene.js
    switch (currentTitle) {
      case 'Untitled Text':
        return action.params.text;
      case 'Untitled Image':
        return action.params.alt;
      default:
        return currentTitle;
    }
  }

  /**
   * Get adjusted position depending on font size (?).
   * @param {number} posX X-coordinate.
   * @param {number} posY Y-coordinate.
   * @returns {object} Position with x and y.
   */
  getAdjustedInteractionPositions(posX, posY) {
    const interactionEm = 2.5;
    const wrapper = this.sceneWrapperRef.current;
    const wrapperSize = wrapper.getBoundingClientRect();

    if (!wrapperSize.width || !wrapperSize.height) {
      return false;
    }

    const fontSize = parseFloat(wrapper.style.fontSize);
    const interactionSize = interactionEm * fontSize;
    const height = interactionSize / wrapperSize.height * 100;
    if (posY + height > 100) {
      posY = 100 - height;
    }

    const width = interactionSize / wrapperSize.width * 100;
    if (posX + width > 100) {
      posX = 100 - width;
    }

    return {
      posX: posX,
      posY: posY,
    };
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    if (!this.props.isActive) {
      return null;
    }

    const interactions = this.props.sceneParams.interactions || [];

    const hasPreviousScene = this.props.sceneHistory.length > 0;
    const isShowingBackButton = this.props.sceneParams.showBackButton
      && (hasPreviousScene || this.context.extras.isEditor);

    const backButtonClasses = this.context.extras.isEditor
      && !hasPreviousScene
      ? ['disabled']
      : [];

    const imageSceneClasses = ['image-scene-wrapper', 'static-scene'];
    if (this.state.isVerticalImage) {
      imageSceneClasses.push('vertical');
    }

    return (
      <div
        ref={this.overLayRef}
        className='image-scene-overlay'
        aria-hidden={this.props.isHiddenBehindOverlay ? true : undefined}
      >
        <div
          className={imageSceneClasses.join(' ')}
          ref={this.sceneWrapperRef}
        >
          <img
            tabIndex={-1}
            alt={this.props.sceneParams.scenename}
            className='image-scene'
            src={this.props.imageSrc !== undefined ? H5P.getPath(this.props.imageSrc.path, this.context.contentId) : ''}
            onLoad={this.onSceneLoaded.bind(this)}
            ref={this.imageElementRef}
            draggable={false}
          />
          {
            interactions.map((interaction, index) => {
              const pos = this.getPositions(interaction.interactionpos);
              let posX = this.removePercentageDenotationFromPosition(pos.x);
              let posY = this.removePercentageDenotationFromPosition(pos.y);
              const hasUpdatedPositions = this.state.x !== null
                && this.state.y !== null
                && this.state.draggingInteractionIndex === index;
              if (hasUpdatedPositions) {
                posX = this.state.x;
                posY = this.state.y;
              }

              const buttonClasses = [];
              if (this.props.audioIsPlaying === `interaction-${this.props.sceneId}-${index}`) {
                buttonClasses.push('active');
              }

              if (this.state.draggingInteractionIndex === index) {
                buttonClasses.push('dragging');
              }

              if (posX > 91.5) {
                buttonClasses.push('left-aligned');
              }

              if (this.sceneWrapperRef && this.sceneWrapperRef.current) {
                // Adjust interaction position if overflowing
                const pos = this.getAdjustedInteractionPositions(
                  parseFloat(posX),
                  parseFloat(posY)
                );
                if (pos) {
                  posX = pos.posX;
                  posY = pos.posY;
                }
              }

              let title;

              const library = H5P.libraryFromString(interaction.action.library);
              const machineName = library.machineName;
              const isGoToSceneInteraction = machineName === 'H5P.GoToScene';
              const scenes = this.context.params.scenes;
              if (isGoToSceneInteraction) {
                const nextScene = scenes.find((scene) => {
                  return scene.sceneId === interaction.action.params.nextSceneId;
                });
                title = nextScene.scenename;
              }
              else {
                title = this.getInteractionTitle(interaction.action);
              }

              const key = interaction.id || `interaction-${this.props.sceneId}${index}`;

              return (
                interaction.showAsOpenSceneContent ?
                  <OpenContent
                    key={key}
                    staticScene={true}
                    sceneId={this.props.sceneId}
                    leftPosition={posX}
                    topPosition={posY}
                    interactionIndex={index}
                    mouseDownHandler={this.startDragging.bind(this, index)}
                    doubleClickHandler={() => {
                      this.context.trigger('doubleClickedInteraction', index);
                    }}
                    ariaLabel={null}
                    isFocused={this.props.focusedInteraction === index}
                    onBlur={this.props.onBlurInteraction}
                    is3DScene={false}
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
                    title={title}
                    icon={getIconFromInteraction(interaction, scenes)}
                    label={getLabelFromInteraction(interaction)}
                    type={'interaction-' + index}
                    isHiddenBehindOverlay={this.props.isHiddenBehindOverlay}
                    nextFocus={this.props.nextFocus}
                    topPosition={posY}
                    leftPosition={posX}
                    mouseDownHandler={this.startDragging.bind(this, index)}
                    clickHandler={this.props.showInteraction.bind(this, index)}
                    doubleClickHandler={() => {
                      this.context.trigger('doubleClickedInteraction', index);
                    }}
                    buttonClasses={buttonClasses}
                    onBlur={this.props.onBlurInteraction}
                    isFocused={this.props.focusedInteraction === index}
                    // Use the overlay height instead of getWrapperSize because
                    // That is not correct when moving to a new scene without resizing
                    wrapperHeight={this.overLayRef.current ? this.overLayRef.current.clientHeight : 0}
                    staticScene={true}
                    showAsHotspot={interaction.showAsHotspot}
                    sceneId = {this.props.sceneId}
                    interactionIndex = {index}
                    isHotspotTabbable={interaction.hotspotSettings?.isHotspotTabbable}
                    showHotspotOnHover={interaction.hotspotSettings?.showHotspotOnHover}
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
            })
          }
        </div>
        {
          isShowingBackButton &&
          <NavigationButton
            title={this.context.l10n.back}
            icon={Icons.GO_BACK}
            isHiddenBehindOverlay={this.props.isHiddenBehindOverlay}
            clickHandler={this.goToPreviousScene.bind(this)}
            forceClickHandler={true}
            buttonClasses={backButtonClasses}
          />
        }
      </div>
    );
  }
}

StaticScene.contextType = H5PContext;

/** @constant {number} FONT_SIZE_MIN Minimum font size within scene in pixels.*/
StaticScene.FONT_SIZE_MIN_PX = 14;

/** @constant {number} FONT_INCREMENT_THRESHOLD Factor used to increase font size based on scene width. */
StaticScene.FONT_INCREMENT_THRESHOLD = 55;
