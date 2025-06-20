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
    this.props = props;

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
      isDraggingScene: false,
      render: false,
    };

    this.moveX = 0;
    this.moveY = 0;
    this.prevZoomScale = this.props.zoomScale;

    this.onMove = this.onMove.bind(this);
    this.stoppedDragging = this.stoppedDragging.bind(this);
    this.resizeScene = this.resizeScene.bind(this);

    this.handleMouseWheel = this.handleMouseWheel.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchMoveZoom = this.handleTouchMoveZoom.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
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

    if (this.props.isActive) {
      // Add wheel event listener for current scene
      this.sceneWrapperRef.current?.addEventListener('wheel', this.handleMouseWheel, { passive: false });
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
   * @param {object} prevProps Previous properties.
   */
  componentDidUpdate(prevProps) {
    // Remove wheel event listener from prev scene
    if (!this.props.isActive && prevProps.isActive) {
      this.sceneWrapperRef.current?.removeEventListener('wheel', this.handleMouseWheel, { passive: false });
    }

    // Add wheel event listener for current scene
    if (this.props.isActive && !prevProps.isActive) {
      this.sceneWrapperRef.current?.addEventListener('wheel', this.handleMouseWheel, { passive: false });
    }

    if (this.props.isActive && this.props.sceneWaitingForLoad !== null) {
      // Let main know that scene is finished loading
      this.props.doneLoadingNextScene();
    }

    // Specific to Firefox - Interaction buttons are moving out of scope when image is potrait
    if (this.sceneWrapperRef.current !== null
      && this.sceneWrapperRef.current.clientWidth !== this.imageElementRef.current.clientWidth
      && this.imageElementRef.current.clientWidth > 0) {
      this.updateWrapperSize();
    }

    // If zoom scale changes
    if (this.props.zoomScale !== this.prevZoomScale) {
      this.updateWrapperSize();

      if (this.imageElementRef.current) {
        if (this.props.zoomScale < this.prevZoomScale) {
          this.moveScene(0, 0, true);
        }
      }
      else {
        this.moveX = 0;
        this.moveY = 0;
      }

      this.prevZoomScale = this.props.zoomScale;
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
      this.updateWrapperSize();
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
   * Update wrapper size based on image.
   */
  updateWrapperSize() {
    const wrapperElement = this.sceneWrapperRef.current;
    const overlayElement = this.overLayRef.current;
    const imageElement = this.imageElementRef.current;

    if (wrapperElement && overlayElement && imageElement) {
      const image = imageElement.getBoundingClientRect();

      const newWidth = Math.min(image.width, overlayElement.clientWidth);
      wrapperElement.style.width = `${newWidth}px`;

      // Adjust height in editor to be able to place interactions
      if (this.context.extras.isEditor && !this.state.isVerticalImage) {
        const newHeight = Math.min(image.height, overlayElement.clientHeight);
        wrapperElement.style.height = `${newHeight}px`;
      }
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
    let mouseMovedWhenZoomed = mouseMoved / this.props.zoomScale;
    let wrapperSize = this.getWrapperSize(isVertical);

    position = this.removePercentageDenotationFromPosition(position);
    const movedTo = position - mouseMovedWhenZoomed;

    const interactionParams = this.getDraggingInteraction();

    if (interactionParams.showAsHotspot) {
      const sizeValues = interactionParams.hotspotSettings.hotSpotSizeValues.split(',');
      const elementSizePercentage = isVertical ? sizeValues[1] : sizeValues[0];

      const posMin = elementSizePercentage / 2;
      const posMax = 100 - elementSizePercentage / 2;

      return Math.max(posMin, Math.min(movedTo, posMax));
    }
    const elementBounds = element.getBoundingClientRect();
    const elementSize = isVertical ? elementBounds.height : elementBounds.width;
    let elementSizePercentage = (elementSize / wrapperSize) * 100;

    const posMin = elementSizePercentage / 2;
    const posMax = 100 - elementSizePercentage / 2;

    return Math.max(posMin, Math.min(movedTo, posMax));
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
   * Handle movement of scene image.
   * @param {number} xDiff X-coordinate difference.
   * @param {number} yDiff Y-coordinate difference.
   * @param {boolean} zoomOut True if zooming out. Else false.
   */
  moveScene(xDiff, yDiff, zoomOut = false) {
    // Prevent moving scene when moving interaction
    if (this.state.draggingInteractionIndex !== null) {
      return;
    }

    const imageElement = this.imageElementRef.current;
    const boundsElement = this.overLayRef.current;

    if (!imageElement || !boundsElement) {
      return;
    }

    const vertical = this.state.isVerticalImage;
    const image = imageElement.getBoundingClientRect();
    const bounds = boundsElement.getBoundingClientRect();

    // Handle moving scene sideways
    const imageWidthIsSmallerThanBounds = image.width <= bounds.width;

    if (vertical && imageWidthIsSmallerThanBounds) {
      this.moveX = 0;
    }
    else {
      const newImageRight = image.right + xDiff;
      const newImageLeft = image.left + xDiff;
      const imageRightIsOutsideBounds = newImageRight >= bounds.right;
      const imageLeftIsOutsideBounds = newImageLeft <= bounds.left;
      const imageIsBiggerThanBounds = imageRightIsOutsideBounds && imageLeftIsOutsideBounds;

      // Only move scene sideways if image is bigger than bounds
      if (imageIsBiggerThanBounds && !zoomOut) {
        this.moveX += xDiff;
      }

      if (zoomOut) {
        // Keep image edges at bounds
        if (!imageRightIsOutsideBounds) {
          this.moveX += bounds.right - image.right;
        }
        else if (!imageLeftIsOutsideBounds) {
          this.moveX += bounds.left - image.left;
        }
      }
    }

    // Handle moving scene up and down
    const imageHeightSmallerThanBounds = image.height <= bounds.height;

    if (!vertical && imageHeightSmallerThanBounds) {
      this.moveY = 0;
    }
    else {
      const newImageBottom = image.bottom + yDiff;
      const newImageTop = image.top + yDiff;
      const imageBottomIsOutsideBounds = newImageBottom >= bounds.bottom;
      const imageTopIsOutsideBounds = newImageTop <= bounds.top;
      const imageIsBiggerThanBounds = imageBottomIsOutsideBounds && imageTopIsOutsideBounds;

      // Only move scene up and down if image is bigger than bounds
      if (imageIsBiggerThanBounds && !zoomOut) {
        this.moveY += yDiff;
      }

      if (zoomOut) {
        // Keep image edges at bounds
        if (!imageBottomIsOutsideBounds) {
          this.moveY += bounds.bottom - image.bottom;
        }
        else if (!imageTopIsOutsideBounds) {
          this.moveY += bounds.top - image.top;
        }
      }
    }
  }

  /**
   * Handle mouse down.
   * @param {MouseEvent} event Mouse event (SyntheticBaseEvent).
   */
  handleMouseDown(event) {
    // Prevent moving scene when moving interaction
    if (this.state.draggingInteractionIndex !== null) {
      return;
    }

    const isLeftMouseButton = event.button === 0;
    if (!isLeftMouseButton) {
      return;
    }

    if (this.props.zoomScale === 1 || !this.props.enableZoom) {
      return;
    }

    // Prevent other elements from moving
    event.stopPropagation();

    window.addEventListener('mousemove', this.handleMouseMove, false);
    window.addEventListener('mouseup', this.handleMouseUp, false);

    this.setState({
      isDraggingScene: true,
    });
  }

  /**
   * Handle mouse move.
   * @param {MouseEvent} event Mouse event (SyntheticBaseEvent).
   */
  handleMouseMove(event) {
    let xDiff = event.movementX;
    let yDiff = event.movementY;

    if (event.movementX === undefined || event.movementY === undefined) {
      // Diff on old values
      if (!this.prevPosition) {
        this.prevPosition = {
          x: event.clientX,
          y: event.clientY,
        };
      }
      xDiff = event.clientX - this.prevPosition.x;
      yDiff = event.clientY - this.prevPosition.y;

      this.prevPosition = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    if (xDiff !== 0 || yDiff !== 0) {
      this.moveScene(xDiff, yDiff);

      this.setState({
        render: true,
      });
    }
  }

  /**
   * Handle mouse up.
   */
  handleMouseUp() {
    this.setState({
      isDraggingScene: false,
      render: false,
    });

    window.removeEventListener('mousemove', this.handleMouseMove, false);
    window.removeEventListener('mouseup', this.handleMouseUp, false);
  }

  /**
   * Handle touch start.
   * @param {TouchEvent} event Touch event (SyntheticBaseEvent).
   */
  handleTouchStart(event) {
    // Prevent moving scene when moving interaction
    if (this.state.draggingInteractionIndex !== null) {
      return;
    }

    // Handle move
    if (event.touches.length !== 2) {
      this.startPosition = {
        x: event.touches[0].pageX,
        y: event.touches[0].pageY,
      };

      window.addEventListener('touchmove', this.handleTouchMove, false);
      window.addEventListener('touchend', this.handleTouchEnd, false);
      return;
    }

    // Handle zoom
    if (!this.props.enableZoom) {
      return;
    }

    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    this.startDistance = distance;

    window.addEventListener('touchmove', this.handleTouchMoveZoom, false);
    window.addEventListener('touchend', this.handleTouchEnd, false);
  }

  /**
   * Handle touch move zoom.
   * @param {TouchEvent} event Touch event (SyntheticBaseEvent).
   */
  handleTouchMoveZoom(event) {
    if (!this.props.enableZoom) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    this.endDistance = distance;

    const diff = this.endDistance - this.startDistance;

    if (diff > 0) {
      this.props.zoomIn(this.props.sceneParams.sceneType, 'touch');
    }
    else if (diff < 0) {
      this.props.zoomOut(this.props.sceneParams.sceneType, 'touch');
    }
  }

  /**
   * Handle touch move.
   * @param {TouchEvent} event Touch event (SyntheticBaseEvent).
   */
  handleTouchMove(event) {
    if (event.touches.length > 1) {
      return;
    }

    // Prevent move if not zoomed in
    if (this.props.zoomScale === 1) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!this.prevPosition) {
      this.prevPosition = {
        x: this.startPosition.x,
        y: this.startPosition.y,
      };
    }

    const xDiff = event.changedTouches[0].pageX - this.prevPosition.x;
    const yDiff = event.changedTouches[0].pageY - this.prevPosition.y;

    this.prevPosition = {
      x: event.changedTouches[0].pageX,
      y: event.changedTouches[0].pageY,
    };

    if (xDiff !== 0 || yDiff !== 0) {
      this.moveScene(xDiff, yDiff);

      this.setState({
        render: true,
      });
    }
  }

  /**
   * Handle touch end.
   */
  handleTouchEnd() {
    this.prevPosition = null;

    this.setState({
      render: false,
    });

    window.removeEventListener('touchmove', this.handleTouchMove, false);
    window.removeEventListener('touchmove', this.handleTouchMoveZoom, false);
    window.removeEventListener('touchend', this.handleTouchEnd, false);
  }

  /**
   * Handle mouse wheel.
   * @param {WheelEvent} event Mouse wheel event (SyntheticBaseEvent).
   */
  handleMouseWheel(event) {
    // Prevent moving scene when moving interaction
    if (this.state.draggingInteractionIndex !== null) {
      return;
    }

    if (!this.props.enableZoom) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.deltaY < 0 && !this.props.maxZoomedIn) {
      this.props.zoomIn(this.props.sceneParams.sceneType);
    }
    else if (event.deltaY > 0 && !this.props.maxZoomedOut) {
      this.props.zoomOut(this.props.sceneParams.sceneType);
    }
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown(event) {
    // Prevent moving scene when moving interaction
    if (this.state.draggingInteractionIndex !== null) {
      return;
    }

    // Handle zooming
    if (this.props.enableZoom) {
      switch (event.key) {
        case '+':
          this.props.zoomIn(this.props.sceneParams.sceneType);
          break;
        case '-':
          this.props.zoomOut(this.props.sceneParams.sceneType);
          break;
      }
    }

    // Handle move with arrow keys
    const isArrowKey = [
      'ArrowLeft', 'Numpad4', 'ArrowRight', 'Numpad6',
      'ArrowUp', 'Numpad8', 'ArrowDown', 'Numpad2'
    ].includes(event.code);

    if (!isArrowKey || this.props.zoomScale === 1) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    switch (event.code) {
      case 'ArrowLeft':
      case 'Numpad4':
        this.moveScene(20, 0);
        break;
      case 'ArrowRight':
      case 'Numpad6':
        this.moveScene(-20, 0);
        break;
      case 'ArrowUp':
      case 'Numpad8':
        this.moveScene(0, 20);
        break;
      case 'ArrowDown':
      case 'Numpad2':
        this.moveScene(0, -20);
        break;
    }

    this.setState({
      render: true,
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
    const imageElementBounds = imageElement.getBoundingClientRect();

    staticSceneWidth = imageElementBounds.width;
    staticSceneHeight = imageElementBounds.height;

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
   * Get adjusted position after image move or zoom.
   * @param {number} posX X-coordinate.
   * @param {number} posY Y-coordinate.
   * @returns {{posX: number; posY: number}} Position with x and y.
   */
  getInteractionPositionsAfterImageMove(posX, posY) {
    const imageElement = this.imageElementRef.current;
    const wrapperElement = this.sceneWrapperRef.current;

    const elementsExist = imageElement && wrapperElement;
    const hasZoomed = this.props.zoomScale !== 1;
    const hasMoved = this.moveX !== 0 || this.moveY !== 0;

    if (!elementsExist || (!hasZoomed && !hasMoved)) {
      return {
        posX: posX,
        posY: posY,
      };
    }

    const image = this.imageElementRef.current.getBoundingClientRect();
    const wrapper = this.sceneWrapperRef.current.getBoundingClientRect();

    // Adjust position according to how much the image is scaled (zoomed)
    if (this.props.zoomScale !== 1) {
      // Adjust x position
      const xPositionBasedOnImageWidth = posX * image.width / 100;
      const xPositionInPercentage = xPositionBasedOnImageWidth / wrapper.width * 100;
      const imageWidthOverflow = (image.width - wrapper.width) / 2;
      const imageWidthOverflowInPercentage = imageWidthOverflow / wrapper.width * 100;

      posX = xPositionInPercentage - imageWidthOverflowInPercentage;

      // Adjust y position
      const yPositionBasedOnImageHeight = posY * image.height / 100;
      const yPositionInPercentage = yPositionBasedOnImageHeight / wrapper.height * 100;
      const imageHeightOverflow = (image.height - wrapper.height) / 2;
      const imageHeightOverflowInPercentage = imageHeightOverflow / wrapper.height * 100;

      posY = yPositionInPercentage - imageHeightOverflowInPercentage;
    }

    // Adjust position according to how much the image has been moved.
    // Since movement is detected on the wrapper, we need to find the percentage of the
    // movement based on the wrapper size.
    if (this.moveX !== 0) {
      const moveXInPercentage = this.moveX / wrapper.width * 100;
      posX += moveXInPercentage;
    }

    if (this.moveY !== 0) {
      const moveYInPercentage = this.moveY / wrapper.height * 100;
      posY += moveYInPercentage;
    }

    return {
      posX: posX,
      posY: posY,
    };
  }

  onNavigationButtonGeometryChanged() {
    this.forceUpdate();
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
    if (this.props.zoomScale !== 1) {
      imageSceneClasses.push('grab-cursor');
    }
    if (this.state.isDraggingScene) {
      imageSceneClasses.push('dragging');
    }

    return (
      <div
        style={{ '--zoom-percentage': this.props.zoomPercentage }}
        ref={this.overLayRef}
        className='image-scene-overlay'
        aria-hidden={this.props.isHiddenBehindOverlay ? true : undefined}
      >
        <div
          className={imageSceneClasses.join(' ')}
          ref={this.sceneWrapperRef}
          onMouseDown={this.handleMouseDown.bind(this)}
          onTouchStart={this.handleTouchStart.bind(this)}
          onKeyDown={this.handleKeyDown.bind(this)}
        >
          <img
            tabIndex={-1}
            alt={this.props.sceneParams.scenename}
            className='image-scene'
            src={this.props.imageSrc !== undefined ? H5P.getPath(this.props.imageSrc.path, this.context.contentId) : ''}
            onLoad={this.onSceneLoaded.bind(this)}
            ref={this.imageElementRef}
            draggable={false}
            style={{
              left: `${this.moveX}px`,
              top: `${this.moveY}px`,
              transform: `scale(${this.props.zoomScale})`,
              position: 'relative',
              touchAction: 'none',
            }}
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

              if (this.imageElementRef?.current) {
                // Adjust interaction position after image move or zoom
                const pos = this.getInteractionPositionsAfterImageMove(
                  parseFloat(posX),
                  parseFloat(posY)
                );

                posX = pos.posX;
                posY = pos.posY;
              }

              const isGoToSceneInteraction =
                H5P.libraryFromString(interaction.action.library)?.machineName === 'H5P.GoToScene';

              const title = this.props.getInteractionTitle(interaction.action);

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
                    zoomScale={this.props.zoomScale}
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
                    icon={getIconFromInteraction(interaction, this.context.params.scenes)}
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
                    zoomScale={this.props.zoomScale}
                    onGeometryChanged={this.onNavigationButtonGeometryChanged.bind(this)}
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
