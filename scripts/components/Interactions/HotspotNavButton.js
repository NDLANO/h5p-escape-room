import React, { useCallback, useEffect, useRef } from 'react';
import './NavigationButton.scss';
import { H5PContext } from '../../context/H5PContext.js';
import { scaleOpenContentElement } from '../../utils/open-content-utils.js';
import { staticSceneWidth, staticSceneHeight } from '../Scene/SceneTypes/StaticScene.js';
import { clamp } from '../../utils/utils.js';
import PropTypes from 'prop-types';

export default class HotspotNavButton extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.state = {
      anchorDrag : false,
      canDrag : false,
      camPosYaw : 0,
      camPosPitch : 0,
      startMousePos : 0,
      startMidPoint : 0,
      sizeWidth : 0,
      sizeHeight : 0,
      elementRect: null,
    };
  }

  /**
   * React life-cycle handler: Component did mount.
   */
  componentDidMount() {
    const [sizeWidth, sizeHeight] = this.props.getHotspotValues();

    this.setState({
      sizeWidth,
      sizeHeight,
    });
  }

  /**
   * React life-cycle handler: Component did update.
   * @param {object} prevProps Previous props.
   */
  componentDidUpdate(prevProps) {
    // If changed to panorama, make sure the height does not exceed maximum
    if (this.props.isPanorama && !prevProps.isPanorama && this.context.isEditor) {
      if (this.state.sizeHeight > HotspotNavButton.MAX_HEIGHT_PANORAMA) {
        this.setState({
          sizeHeight: HotspotNavButton.MAX_HEIGHT_PANORAMA
        });
      }
    }
  }

  /**
   * Toggle drag state.
   */
  toggleDrag() {
    const canDrag = this.state.canDrag;
    this.setState({ canDrag: !canDrag });

    if (!this.props.staticScene) {
      /*
       * If cant drag anymore, start rendering of threesixty scene, also set
       * camera position that is stored when start hotspot scaling
       */
      if (canDrag) {
        this.context.threeSixty.startRendering();
        this.context.threeSixty.setCameraPosition(
          this.state.camPosYaw, this.state.camPosPitch
        );
      }
      else {
        // Store current position, because technically still dragging background
        this.setState({
          camPosYaw : this.context.threeSixty.getCurrentPosition().yaw,
          camPosPitch : this.context.threeSixty.getCurrentPosition().pitch
        });

        // Stop rendering threesixty scene so it doesn't look like moving around
        this.context.threeSixty.stopRendering();
      }
    }
  }

  /**
   * Handle anchor mouse down.
   * @param {PointerEvent} event Event.
   * @param {boolean} isHorizontalDrag True for horizontal dragging.
   */
  onAnchorDragMouseDown(event, isHorizontalDrag) {
    /*
     * Based on direction, store x or y start position of mouse, find center of
     * div, startMidPoint, which is needed for scaling from
     */
    this.setState({
      anchorDrag: true,
      startMousePos: isHorizontalDrag ?
        event.clientX :
        event.clientY,
      startMidPoint: isHorizontalDrag ?
        this.state.sizeWidth / 2 :
        this.state.sizeHeight / 2,
      elementRect: this.props.reference.current?.getBoundingClientRect() ?? null
    });
  }

  /**
   * Handle mouse movement.
   * @param {PointerEvent} event Mouse event.
   * @param {boolean} isHorizontalDrag True for vertical dragging.
   */
  onMouseMove(event, isHorizontalDrag) {
    const { clientX, clientY } = event;
    const newSize = scaleOpenContentElement(
      clientX,
      clientY,
      !this.props.staticScene,
      isHorizontalDrag,
      this.state.elementRect,
      this.state.startMousePos,
      this.state.startMidPoint
    );

    if (
      newSize > HotspotNavButton.SIZE_MIN && newSize < HotspotNavButton.SIZE_MAX
    ) {
      /*
       * These values are used for inline styling in div in render loop,
       * updating div dimensions when mousemove event fires
       */
      if (this.props.staticScene) {
        isHorizontalDrag ?
          this.setState({ sizeWidth: (newSize / staticSceneWidth) * 100 }) :
          this.setState({ sizeHeight: (newSize / staticSceneHeight) * 100 });
      }
      else {
        const isPanorma = this.props.isPanorama;
        const newSizePanorama = Math.min(newSize, HotspotNavButton.MAX_HEIGHT_PANORAMA);

        isHorizontalDrag ?
          this.setState({ sizeWidth: newSize }) :
          this.setState({ sizeHeight: isPanorma ? newSizePanorama : newSize });
      }

      this.props.resizeOnDrag(this.state.sizeWidth, this.state.sizeHeight);
    }
  }

  /**
   * Handle anchor drag mouse up.
   */
  onAnchorDragMouseUp() {
    const newSizeWidth = this.state.sizeWidth;
    const newSizeHeight = this.state.sizeHeight;

    this.setState({ anchorDrag: false });

    // Used for writing data into editor, for them to persist into the view
    this.props.setHotspotValues(newSizeWidth, newSizeHeight);
  }

  /**
   * Determine tab index value.
   * @returns {number} Tab index value.
   */
  determineTabIndex() {
    return this.context.extras.isEditor || this.props.isHotspotTabbable ?
      this.props.tabIndexValue :
      -1;
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    const DragButton = (innerProps) => {
      const hotspotBtnRef = useRef(null);

      const mouseMoveHandler = (event) => {
        this.onMouseMove(event, !innerProps.horizontalDrag);
      };

      // Add mouseup listener on document so user can release mouse everywhere
      const handleMouseDown = useCallback((event) => {
        this.onAnchorDragMouseDown(event, !innerProps.horizontalDrag);
        this.toggleDrag();
        document.addEventListener('mousemove', mouseMoveHandler);

        document.addEventListener(
          'mouseup',
          () => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            this.toggleDrag();
            this.onAnchorDragMouseUp();
          },
          { once: true }
        );
      }, []);

      useEffect(() => {
        /*
         * Stop propagation early on: mousedown is already listened to by
         * threesixty
         */
        hotspotBtnRef.current.addEventListener('mousedown', (event) => {
          event.stopPropagation();
          handleMouseDown(event);
        });
      }, []);

      return (
        <button
          className={innerProps.horizontalDrag ?
            'drag drag--vertical' :
            'drag drag--horizontal'
          }
          ref={hotspotBtnRef}
          tabIndex={this.props.tabIndexValue}
          aria-label={innerProps.horizontalDrag ?
            this.context.l10n.hotspotDragHorizAlt :
            this.context.l10n.hotspotDragVertiAlt
          }
        />
      );
    };

    const iconSize = clamp(
      20,
      Math.min(this.state.sizeWidth / 2, this.state.sizeHeight / 2),
      40
    );

    return (
      <div
        className={
          `nav-button-hotspot-wrapper ${
            this.props.staticScene ? 'nav-button-hotspot-wrapper--is-static' : ''
          } `
        }
        style={this.props.staticScene ? { height:'100%', width:'100%' } : {}}>
        <button
          ref={this.props.reference}
          aria-label={this.props.ariaLabel}
          style={this.props.staticScene ?
            { width: '100%', height: '100%', fontSize: iconSize } :
            { width: `${this.state.sizeWidth}px`, height: `${this.state.sizeHeight}px`, fontSize: iconSize }
          }
          className={
            'nav-button nav-button-hotspot ' +
            `${this.props.showHotspotOnHover ? 'nav-button-hotspot--show-hotspot-on-hover' : ''} ` +
            `${this.context.extras.isEditor ? 'nav-button-hotspot--editor' : ''}`
          }
          tabIndex={this.determineTabIndex()}
          onClick={this.props.onClickEvent}
          onDoubleClick={this.props.onDoubleClickEvent}
          onMouseDown={ this.props.onMouseDownEvent}
          onMouseUp={this.props.onMouseUpEvent}
          onFocus={this.props.onFocusEvent}
          onBlur={this.props.onBlurEvent}
        />
        {
          this.context.extras.isEditor ? <>
            <DragButton horizontalDrag = {true}/>
            <DragButton horizontalDrag = {false}/>
          </>
            : ''
        }
      </div>
    );
  }
}
HotspotNavButton.contextType = H5PContext;

/** @constant {number} SIZE_MIN Minimum size of 3D hotspot */
HotspotNavButton.SIZE_MIN = 20;

/** @constant {number} SIZE_MAX Maximum size of 3D hotspot */
HotspotNavButton.SIZE_MAX = 2000;

/** @constant {number} MAX_HEIGHT_PANORAMA Maximum hotspot height in Panorama */
HotspotNavButton.MAX_HEIGHT_PANORAMA = 800;

HotspotNavButton.propTypes = {
  getHotspotValues: PropTypes.func.isRequired,
  setHotspotValues: PropTypes.func.isRequired,
  resizeOnDrag: PropTypes.func.isRequired,
  staticScene: PropTypes.bool.isRequired,
  isPanorama: PropTypes.bool.isRequired,
  reference: PropTypes.object.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  showHotspotOnHover: PropTypes.bool.isRequired,
  tabIndexValue: PropTypes.number.isRequired,
  onClickEvent: PropTypes.func,
  onDoubleClickEvent: PropTypes.func,
  onMouseDownEvent: PropTypes.func,
  onMouseUpEvent: PropTypes.func,
  onFocusEvent: PropTypes.func,
  onBlurEvent: PropTypes.func,
  isHotspotTabbable: PropTypes.bool.isRequired
};
