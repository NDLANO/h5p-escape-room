import React, { useCallback, useEffect, useRef } from 'react';
import './OpenContent.scss';
import { H5PContext } from '../../context/H5PContext';
import { scaleOpenContentElement } from '../../utils/open-content-utils';

export default class OpenContent extends React.Component {
  /**
   * @class
   * @param {object} props Rect props.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);

    this.state = {
      anchorDrag: false,
      canDrag: false,
      camPosYaw: 0,
      camPosPitch: 0,
      startMousePos: 0,
      startMidPoint: 0,
      sizeWidth: 0,
      sizeHeight: 0,
      isFocused: this.props.isFocused,
      isMouseOver: false,
      elementRect: null,
    };

    this.openContent = React.createRef();
    this.openContentWrapper = React.createRef();
    this.h5pInstanceRef = React.createRef();
  }

  /**
   * Add focus listener.
   */
  addFocusListener() {
    this.openContentWrapper?.current.addEventListener('focus', this.onFocus);
  }

  /**
   * Handle focus.
   */
  onFocus() {
    // Already focused
    if (this.state.isFocused) {
      return;
    }

    this.setState({
      isFocused: true,
    });
  }

  /**
   * Handle blur.
   * @param {FocusEvent} event Event.
   */
  onBlur(event) {
    const openContentWrapper =
      this.openContentWrapper && this.openContentWrapper.current;

    const target = (event.relatedTarget);

    if (openContentWrapper?.contains(target)) {
      // Clicked target is child of button wrapper and not the expandButton, don't blur
      this.setFocus();
      return;
    }

    this.setState({ isFocused: false });

    if (this.props.onBlur) {
      this.props.onBlur();
    }
  }

  /**
   * React life-cycle function: Component did mount.
   */
  componentDidMount() {
    const [sizeWidth, sizeHeight] = this.getHotspotValues();
    this.setState({
      sizeWidth,
      sizeHeight,
    });

    if (this.props.onMount) {
      // Let parent know this element should be added to the THREE world.
      this.props.onMount(this.openContentWrapper.current);
    }

    this.attachContentFromInteraction(this.h5pInstanceRef.current);

    this.addFocusListener();
    if (this.state.isFocused) {
      window.setTimeout(() => {
        this.setFocus();
      }, 0);
    }
  }

  /**
   * React life-cycle function: Component is about to unmount.
   */
  componentWillUnmount() {
    if (this.props.onUnmount) {
      const el = this.openContentWrapper.current;
      // We want this to run after the component is removed

      window.setTimeout(() => {
        // Let parent know this element should be remove from the THREE world.
        this.props.onUnmount(el);
      }, 0);
    }
  }

  /**
   * React life-cycle function: Component did update.
   */
  componentDidUpdate() {
    if (this.props.onUpdate) {
      // Let parent know this element is updated. (Position might have changed.)
      this.props.onUpdate(this.openContentWrapper.current);
    }
  }

  /**
   * Get hotspot values.
   * @returns {number[]} Width and Height.
   */
  getHotspotValues() {
    const scene = this.context.params.scenes.find((scene) => {
      return scene.sceneId === this.props.sceneId;
    });
    const interaction = scene.interactions[this.props.interactionIndex];

    return interaction.hotspotSettings.hotSpotSizeValues.split(',');
  }

  /**
   * Set hotspot values.
   * @param {number} widthX Width to set.
   * @param {number} heightY Height to set.
   */
  setHotspotValues(widthX, heightY) {
    const scene = this.context.params.scenes.find(
      (scene) => scene.sceneId === this.props.sceneId
    );
    const interaction = scene.interactions[this.props.interactionIndex];
    interaction.hotspotSettings.hotSpotSizeValues = `${widthX},${heightY}`;
  }

  /**
   * Toggle dragging state.
   */
  toggleDrag() {
    const canDrag = this.state.canDrag;
    this.setState({ canDrag: !canDrag });

    if (!this.props.staticScene) {
      /*
       * If we cant drag anymore, we start rendering of threesixty scene, we
       * also set camera position that is stored when we start hotspot scaling
       */
      if (canDrag) {
        this.context.threeSixty.startRendering();
        this.context.threeSixty.setCameraPosition(
          this.state.camPosYaw,
          this.state.camPosPitch
        );
      }
      else {
        // Store current position, because technically still dragging background
        this.setState({
          camPosYaw: this.context.threeSixty.getCurrentPosition().yaw,
          camPosPitch: this.context.threeSixty.getCurrentPosition().pitch,
        });

        // Stop rendering threesixty scene so it doesn't look like moving around
        this.context.threeSixty.stopRendering();
      }
    }
  }

  /**
   * Handle anchor mouse down.
   * @param {PointerEvent} event Event.
   * @param {boolean} isHorizontalDrag True for horizontal movement.
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
      elementRect: this.openContent.current?.getBoundingClientRect() ?? null,
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
      this.props.is3DScene,
      isHorizontalDrag,
      this.state.elementRect,
      this.state.startMousePos,
      this.state.startMidPoint
    );

    let sizeMax = OpenContent.SIZE_MAX;

    if (this.props.is3DScene) {
      sizeMax = OpenContent.SIZE_MAX_360;
    }
    if (this.props.isPanorama) {
      sizeMax = OpenContent.SIZE_MAX_PANORAMA;
    }

    if (
      newSize > OpenContent.SIZE_MIN && newSize < sizeMax
    ) {
      /*
       * These values are used for inline styling in div in render loop,
       * updating div dimensions when mousemove event fires
       */
      isHorizontalDrag ?
        this.setState({ sizeWidth: newSize }) :
        this.setState({ sizeHeight: newSize });
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
    this.setHotspotValues(newSizeWidth, newSizeHeight);
  }

  /**
   * Get style.
   * @returns {object} Style values for top/left position.
   */
  getStyle() {
    const style = {};

    if (this.props.topPosition !== undefined) {
      style.top = `${this.props.topPosition}%`;
    }

    if (this.props.leftPosition !== undefined) {
      style.left = `${this.props.leftPosition}%`;
    }

    return style;
  }

  /**
   * Get content from interaction.
   * @param {HTMLElement} wrapper Wrapper to take in H5P content.
   */
  attachContentFromInteraction(wrapper) {
    const scene = this.context.params.scenes.find((scene) => {
      return scene.sceneId === this.props.sceneId;
    });

    const interaction = scene.interactions[this.props.interactionIndex];

    H5P.newRunnable(
      interaction.action,
      this.context.contentId,
      H5P.jQuery(wrapper)
    );
  }

  /**
   * Handle double click.
   */
  onDoubleClick() {
    if (this.props.doubleClickHandler) {
      this.props.doubleClickHandler();
    }

    this.setState({ isFocused: false });
  }

  /**
   * Handle mouse down.
   * @param {PointerEvent} event Event.
   */
  onMouseDown(event) {
    if (this.context.extras.isEditor && this.props.mouseDownHandler) {
      this.props.mouseDownHandler(event);
    }
  }

  /**
   * Set focus.
   */
  setFocus() {
    const isFocusable =
      this.context.extras.isEditor &&
      this.openContentWrapper &&
      this.openContentWrapper.current;

    if (isFocusable) {
      this.openContentWrapper.current.focus({ preventScroll: true });
    }
  }

  /**
   * Handle focus.
   * @param {FocusEvent} event Event.
   */
  handleFocus(event) {
    if (this.context.extras.isEditor) {
      if (
        this.openContentWrapper &&
        this.openContentWrapper.current &&
        this.openContentWrapper === event.target
      ) {
        this.openContentWrapper.current.focus({ preventScroll: true });
      }
      return;
    }

    if (!this.context.extras.isEditor && this.props.onFocus) {
      if (this.skipFocus) {
        this.skipFocus = false;
      }
      else {
        this.props.onFocus();
      }
    }
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    const wrapperClasses = ['open-content-wrapper'];

    let width = this.state.sizeWidth;
    let height = this.state.sizeHeight;

    if (this.props.zoomScale && this.props.staticScene) {
      width *= this.props.zoomScale;
      height *= this.props.zoomScale;
    }

    if (this.state.isMouseOver) {
      wrapperClasses.push('hover');
    }

    // only apply custom focus if we have children that are shown on focus
    if (this.state.isFocused && this.props.children) {
      wrapperClasses.push('focused');
    }

    // Add classname to current active element (wrapper, button or expand label button) so it can be shown on top
    if (this.state.isFocused && this.props.children) {
      wrapperClasses.push('active-element');
    }

    if (this.props.is3d) {
      wrapperClasses.push('render-in-3d');
    }

    const DragButton = (innerProps) => {
      const hotspotBtnRef = useRef(null);

      const mouseMoveHandler = (event) => {
        this.onMouseMove(event, innerProps.horizontalDrag);
      };

      // Add mouseup listener on document so user can release mouse everywhere
      const handleMouseDown = useCallback((event) => {
        this.onAnchorDragMouseDown(event, innerProps.horizontalDrag);
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
        /*In order to take control of the mousedown listener, we have to it when the component mount,
       the reason for this is that we have to stop the propagation early on, since mousedown is already listened to by threesixty */
        hotspotBtnRef.current.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          handleMouseDown(e);
        });
      }, []);

      return (
        <button
          className={
            innerProps.horizontalDrag
              ? 'drag drag--horizontal'
              : 'drag drag--vertical'
          }
          tabIndex={innerProps.tabIndex}
          ref={hotspotBtnRef}
          aria-label={
            innerProps.horizontalDrag
              ? this.context.l10n.hotspotDragHorizAlt
              : this.context.l10n.hotspotDragVertiAlt
          }
        />
      );
    };

    return (
      <div
        ref={this.openContentWrapper}
        className={wrapperClasses.join(' ')}
        style={this.getStyle()}
        tabIndex={0}
        onFocus={this.handleFocus.bind(this)}
        onBlur={this.onBlur.bind(this)}
      >
        <div
          className={`open-content ${
            this.context.extras.isEditor ? 'open-content--editor' : ''
          }`}
          ref={this.openContent}
          aria-label={this.props.ariaLabel}
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
          onDoubleClick={this.onDoubleClick.bind(this)}
          onMouseDown={this.onMouseDown.bind(this)}
          onClick={this.setFocus.bind(this)}
        >
          <div
            className={'inner-content'}
            ref={this.h5pInstanceRef}
            // dangerouslySetInnerHTML={{
            //   __html: this.getContentFromInteraction(),
            // }}
          />
          {this.context.extras.isEditor ? (
            <>
              <DragButton horizontalDrag={true} tabIndex={-1} />
              <DragButton horizontalDrag={false} tabIndex={-1} />
            </>
          ) : (
            ''
          )}
        </div>

        {this.props.children}
      </div>
    );
  }
}

OpenContent.contextType = H5PContext;

/** @constant {number} SIZE_MIN Minimum size for content. */
OpenContent.SIZE_MIN = 64;

/** @constant {number} SIZE_MAX Maximum size for content. */
OpenContent.SIZE_MAX = 512;

/** @constant {number} SIZE_MAX_360 Maximum size for 360 content */
OpenContent.SIZE_MAX_360 = 1024;

/** @constant {number} SIZE_MAX_PANORAMA Maximum size for Panorama content */
OpenContent.SIZE_MAX_PANORAMA = 720;
