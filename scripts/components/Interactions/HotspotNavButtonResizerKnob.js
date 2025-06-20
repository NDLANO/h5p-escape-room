import React from 'react';
import { staticSceneWidth, staticSceneHeight } from '../Scene/SceneTypes/StaticScene';
import './HotspotNavButtonResizerKnob.scss';
import { H5PContext } from '../../context/H5PContext';

/** @constant {number} SIZE_MIN Minimum size of 3D hotspot */
const HOTSPOT_SIZE_MIN = 40;

/** @constant {number} SIZE_MAX Maximum size of 3D hotspot */
const HOTSPOT_SIZE_MAX = 2000;

/** @constant {number} MAX_HEIGHT_PANORAMA Maximum hotspot height in Panorama */
const HOTSPOT_MAX_HEIGHT_PANORAMA = 800;

export default class HotspotNavButtonResizerKnob extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;
    this.knobRef = React.createRef();

    this.isLockedHorizontally = this.props.position.includes('middle');
    this.isLockedVertically = this.props.position.includes('center');

    this.isTop = this.props.position.includes('top');
    this.isRight = this.props.position.includes('right');
    this.isBottom = this.props.position.includes('bottom');
    this.isLeft = this.props.position.includes('left');

    this.revertHorizontallyFactor = this.isLeft ? -1 : 1;
    this.revertVerticallyFactor = this.isTop ? -1 : 1;

    this.preservedThreeSixtyPosition = { yaw: 0, pitch: 0 };

    this.handleMouseMove = this.handleMouseMove.bind(this);
  }

  /**
   * React life-cycle handler: component did mount.
   */
  componentDidMount() {
    this.knobRef.current.addEventListener('mousedown', (event) => {
      this.handleMouseDown(event);
    });
  }

  /**
   * React life-cycle handler: component did update.
   * @param {object} prevProps Previous props.
   */
  componentDidUpdate(prevProps) {
    // TODO: Check if this still works
    // If changed to panorama, make sure the height does not exceed maximum
    if (this.props.isPanoramaScene && !prevProps.isPanoramaScene && this.context.isEditor) {
      this.hotspotHeight = Math.min(this.hotspotHeight, HOTSPOT_MAX_HEIGHT_PANORAMA);
    }
  }

  /**
   * Handle mouse down event.
   * @param {object} event Mouse down event.
   */
  handleMouseDown(event) {
    event.stopPropagation();

    this.toggleThreeSixtyRendering(false);

    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', () => {
      this.handleMouseUp();
    }, { once: true });

    this.startMousePosition = { x: event.clientX, y: event.clientY };
  }

  /**
   * Handle mouse move event.
   * @param {object} event Mouse move event.
   */
  handleMouseMove(event) {
    if (this.props.isStaticScene) {
      this.handleMouseMoveStaticScene({ x: event.clientX, y: event.clientY });
    }
    else {
      this.handleMouseMoveThreeSixtyScene({ x: event.clientX, y: event.clientY });
    }
  }

  /**
   * Handle mouse move event for static scene.
   * @param {object} currentMousePosition Curretn mouse position.
   * @param {number} currentMousePosition.x Mouse x position.
   * @param {number} currentMousePosition.y Mouse y position.
   */
  handleMouseMoveStaticScene(currentMousePosition) {
    // Beware! Geometry values are percentage values in relation to the scene size

    // TODO: Zoom

    // Percentage values to pixel values
    const oldGeometry = this.props.getHotspotGeometry();

    const newGeometry = {
      width: oldGeometry.width / 100 * staticSceneWidth,
      height: oldGeometry.height / 100 * staticSceneHeight,
      x: oldGeometry.x / 100 * staticSceneWidth,
      y: oldGeometry.y / 100 * staticSceneHeight,
    };

    const deltaX = currentMousePosition.x - this.startMousePosition.x;
    const deltaY = currentMousePosition.y - this.startMousePosition.y;

    // Compute new width and height
    if (!this.isLockedHorizontally) {
      newGeometry.height = newGeometry.height + deltaY * this.revertVerticallyFactor;
      newGeometry.y = newGeometry.y + deltaY / 2; // Who thought it was a good idea to use the center of the hotspot as reference point?
    }
    if (!this.isLockedVertically) {
      newGeometry.width = newGeometry.width + deltaX * this.revertHorizontallyFactor;
      newGeometry.x = newGeometry.x + deltaX / 2; // Who thought it was a good idea to use the center of the hotspot as reference point?
    }

    this.startMousePosition = currentMousePosition;

    if (
      newGeometry.width < HOTSPOT_SIZE_MIN || newGeometry.width > HOTSPOT_SIZE_MAX ||
      newGeometry.height < HOTSPOT_SIZE_MIN || newGeometry.height > HOTSPOT_SIZE_MAX
    ) {
      return;
    }

    if (
      newGeometry.x < 0 || newGeometry.y < 0 ||
      newGeometry.x + newGeometry.width > staticSceneWidth || newGeometry.y + newGeometry.height > staticSceneHeight
    ) {
      return;
    }

    // Turn into percentage values
    newGeometry.width = newGeometry.width / staticSceneWidth * 100;
    newGeometry.height = newGeometry.height / staticSceneHeight * 100;
    newGeometry.x = newGeometry.x / staticSceneWidth * 100;
    newGeometry.y = newGeometry.y / staticSceneHeight * 100;

    if (
      newGeometry.width > 100 || newGeometry.height > 100 ||
      newGeometry.x < 0 || newGeometry.y < 0 ||
      newGeometry.x + newGeometry.width > 100 || newGeometry.y + newGeometry.height > 100
    ) {
      return;
    }

    this.props.resizeOnDrag(newGeometry);
  }

  /**
   * Handle mouse move event for three sixty scene.
   * @param {object} currentMousePosition Curretn mouse position.
   * @param {number} currentMousePosition.x Mouse x position.
   * @param {number} currentMousePosition.y Mouse y position.
   */
  handleMouseMoveThreeSixtyScene(currentMousePosition) {
    // Beware: Geometry uses pixel values that will not match the ones on screen, because of ThreeJS transformations
    const newGeometry = this.props.getHotspotGeometry();

    // TODO: Important, find out how to interpret x and y!

    const deltaX = currentMousePosition.x - this.startMousePosition.x;
    const deltaY = currentMousePosition.y - this.startMousePosition.y;

    // Compute new width and height
    if (!this.isLockedHorizontally) {
      newGeometry.height = newGeometry.height + deltaY * this.revertVerticallyFactor;
    }
    if (!this.isLockedVertically) {
      newGeometry.width = newGeometry.width + deltaX * this.revertHorizontallyFactor;
    }

    this.startMousePosition = currentMousePosition;

    // TODO: Find a way to scale the resizing ...
    // TODO: Separate width and position resizing ...

    const newHeightPanorama = Math.min(newGeometry.height, HOTSPOT_MAX_HEIGHT_PANORAMA);
    newGeometry.height = this.props.isPanoramaScene ? newHeightPanorama : newGeometry.height;

    if (
      newGeometry.width < HOTSPOT_SIZE_MIN || newGeometry.width > HOTSPOT_SIZE_MAX ||
      newGeometry.height < HOTSPOT_SIZE_MIN || newGeometry.height > HOTSPOT_SIZE_MAX
    ) {
      return;
    }

    console.log('newGeometry', newGeometry);

    this.props.resizeOnDrag(newGeometry);
  }

  /**
   * Handle mouse up event.
   */
  handleMouseUp() {
    document.removeEventListener('mousemove', this.handleMouseMove);

    this.toggleThreeSixtyRendering(true);
  }

  /**
   * Toggle three sixty rendering.
   * @param {boolean} [state] Forced state of three sixty rendering, true to start, false to stop.
   */
  toggleThreeSixtyRendering(state) {
    if (this.props.isStaticScene) {
      return;
    }

    this.isThreeSixtyRendering = typeof state === 'boolean' ? state : !this.isThreeSixtyRendering;

    if (this.isThreeSixtyRendering) {
      // Start rendering threesixty and set previous position
      this.context.threeSixty.startRendering();
      this.context.threeSixty.setCameraPosition(
        this.preservedThreeSixtyPosition.yaw,
        this.preservedThreeSixtyPosition.pitch
      );
    }
    else {
      // Stop rendering threesixty and preserve current position
      this.preservedThreeSixtyPosition = this.context.threeSixty.getCurrentPosition();
      this.context.threeSixty.stopRendering();
    }
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    return <button
      className={`hotspot-nav-button-resizer-knob${this.props.isEditor ? ' editor' : ''} ${this.props.position}`}
      ref={this.knobRef}
    />;
  }
}
HotspotNavButtonResizerKnob.contextType = H5PContext;
