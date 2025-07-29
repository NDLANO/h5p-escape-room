import React from 'react';
import './NavigationButton.scss';
import { H5PContext } from '../../context/H5PContext';
import NavigationButtonLabel, { getLabelPos, getLabelText, isHoverLabel } from './NavigationButtonLabel';
import HotspotNavButton from './HotspotNavButton';

export const Icons = {
  INFO: 'h5p-info-button h5p-interaction-button',
  QUESTION: 'h5p-question-button h5p-interaction-button',
  GO_TO_SCENE: 'h5p-go-to-scene-button',
  GO_BACK: 'h5p-go-back-button',
  SCENE_DESCRIPTION: 'h5p-scene-description-button',
  AUDIO: 'h5p-audio-button h5p-interaction-button',
  VIDEO: 'h5p-video-button h5p-interaction-button',
  IMAGE: 'h5p-image-button h5p-interaction-button',
  INFO_MARK: 'h5p-info-mark-button h5p-interaction-button',
  LOCK: 'h5p-locked-button h5p-interaction-button',
  UNLOCK: 'h5p-unlocked-button h5p-interaction-button',
  TEXT_BLOCK: 'h5p-text-block-button h5p-interaction-button',
};

const infoInteractions = [
  'H5P.AdvancedText',
  'H5P.Image',
  'H5P.Video',
  'H5P.Summary',
  'H5P.SingleChoiceSet',
  'H5P.MultiChoice',
  'H5P.Blanks',
  'H5P.Crosswords',
  'H5P.ThreeDModel'
];

/**
 * Determine whether an H5P library is considered an info interaction.
 * @param {string} machineName H5P library machine name.
 * @returns {boolean} True, if is info interaction.
 */
const isInfoInteraction = (machineName) => {
  return infoInteractions.includes(machineName);
};

/**
 * Get icon from interaction.
 * @param {object} interaction Interaction.
 * @param {object[]} scenes Scene parameters.
 * @returns {string} Icon lookup key.
 */
export const getIconFromInteraction = (interaction, scenes) => {
  interaction.hotspotSettings = interaction.hotspotSettings ?? {};

  const library = interaction.action.library;
  const machineName = H5P.libraryFromString(library).machineName;
  let icon = '';
  if (
    interaction.passwordSettings?.interactionPassword && !interaction.unlocked
  ) {
    icon = Icons.LOCK;
  }
  else if (machineName === 'H5P.GoToScene') {
    icon = Icons.GO_TO_SCENE;

    const nextScene = scenes.find((scene) => {
      return scene.sceneId === interaction.action.params.nextSceneId;
    });
    if (nextScene && nextScene.iconType === 'plus') {
      icon = Icons.INFO;
    }
  }
  else if (machineName === 'H5P.Audio') {
    icon = Icons.AUDIO;
  }
  else if (machineName === 'H5P.AdvancedText') {
    if (interaction.iconTypeTextBox === 'text-icon') {
      icon = Icons.TEXT_BLOCK;
    }
    else {
      icon = Icons.INFO_MARK;
    }
  }
  else if (machineName === 'H5P.Video') {
    icon = Icons.VIDEO;
  }
  else if (machineName === 'H5P.Image') {
    icon = Icons.IMAGE;
  }
  else if (isInfoInteraction(machineName)) {
    icon = Icons.INFO;
  }
  else {
    icon = Icons.QUESTION;
  }

  return icon;
};

/**
 * Get label from interaction.
 * @param {object} interaction Interaction.
 * @returns {object} Interaction label including label text.
 */
export const getLabelFromInteraction = (interaction) => {
  return { ...interaction.label, labelText: interaction.labelText };
};

export default class NavigationButton extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.navButtonWrapper = React.createRef();
    this.navButton = React.createRef();
    this.expandButton = React.createRef();
    this.onBlur = this.onBlur.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.resizeOnDrag = this.resizeOnDrag.bind(this);

    this.state = {
      isFocused: this.props.isFocused,
      expandButtonFocused: false,
      innerButtonFocused: false,
      isMouseOver: false,
    };
  }

  /**
   * Resize on drag.
   * @param {number} width Width.
   * @param {number} height Height.
   */
  resizeOnDrag(width, height) {
    this.setHotspotValues(width, height);

    if (this.context.extras.isEditor) {
      this.forceUpdate();
    }
  }

  /**
   * Add focus listener.
   */
  addFocusListener() {
    if (this.navButtonWrapper) {
      this.navButtonWrapper.current.addEventListener('focus', this.onFocus);
    }
  }

  /**
   * Handle receiving focus.
   */
  onFocus() {
    if (this.state.isFocused) {
      return; // Already focused
    }

    this.setState({ isFocused: true });
    this.props.onFocusedInteraction?.();
  }

  /**
   * Handle losing focus.
   * @param {FocusEvent} event Event.
   */
  onBlur(event) {
    const navButtonWrapper = this.navButtonWrapper?.current;

    if (
      navButtonWrapper?.contains(event.relatedTarget) &&
      (!this.expandButton || event.relatedTarget !== this.expandButton.current)
    ) {
      // Target is child of button wrapper and not expandButton, don't blur
      this.setFocus();
      return;
    }

    this.setState({ isFocused: false });

    this.props.onBlur?.();
  }

  /**
   * React life-cycle handler: Component did mount.
   */
  componentDidMount() {
    if (this.props.onMount) {
      // Let parent know this element should be added to the THREE world.
      this.props.onMount(this.navButtonWrapper.current);
    }

    this.addFocusListener();
    if (this.state.isFocused) {
      window.setTimeout(() => {
        this.setFocus();
      }, 0);
    }
  }

  /**
   * React life-cycle handler: Component did update.
   * @param {object} prevProps React props before update.
   */
  componentDidUpdate(prevProps) {
    if (
      this.props.type && this.props.type === this.props.nextFocus &&
      prevProps.nextFocus !== this.props.nextFocus
    ) {
      // Prevent moving camera on next focus (better UX when using mouse)
      this.skipFocus = true;
      this.setFocus();
    }

    if (
      this.props.isFocused && !prevProps.isFocused && this.context.threeSixty
    ) {
      window.setTimeout(() => {
        this.context.threeSixty.preventCameraMovement = true;
        this.setFocus(true);
      }, 0); // Note: Don't think timeout is needed after rendering was fixed
    }

    if (this.props.onUpdate) {
      // Let parent know this element is updated. (Position might have changed.)
      this.props.onUpdate(this.navButtonWrapper.current);
    }

    if (prevProps.isFocused !== this.props.isFocused) {
      if (!this.props.isFocused) {
        this.setState({ isFocused: false });
      }
    }
  }

  /**
   * React life-cycle function: Component is about to be unmounted.
   */
  componentWillUnmount() {
    if (this.navButtonWrapper) {
      this.navButtonWrapper.current.removeEventListener('focus', this.onFocus);
    }

    if (this.props.onUnmount) {
      const element = this.navButtonWrapper.current;
      // We want this to run after the component is removed
      window.setTimeout(() => {
        // Let parent know this element should be remove from the THREE world.
        this.props.onUnmount(element);
      }, 0);
    }
  }

  /**
   * Get style.
   * @param {number} width Width.
   * @param {number} height Height.
   * @returns {object} Style including top, left, width, height appropriate for scene type.
   */
  getStyle(width, height) {
    const style = {};

    /*
     * This is a hack. The way that the position gets interpreted was changed in Escape Room,
     * but since it's based on rendered sizes (using translation by -50%), we cannot use an upgrade script
     * to fix it. Instead, we compute the offset to make it look like it did before.
     */
    const buttonFontSize = 0.92;
    const buttonHeightWidth = 2.5;
    const buttonSizeHalfed = buttonFontSize * buttonHeightWidth / 2;
    const offset = this.props.wasConvertedFromVirtualTour ? buttonSizeHalfed : 0;

    if (this.props.topPosition !== undefined) {
      style.top = `calc(${this.props.topPosition}% + ${offset}em)`;
    }

    if (this.props.leftPosition !== undefined) {
      style.left = `calc(${this.props.leftPosition}% + ${offset}em)`;
    }

    if (this.props.staticScene) {
      // set width and height for static scene
      style.width = `${width}%`;
      style.height = `${height}%`;
    }
    else {
      // set width and height for 360 scene
      style.width = width;
      style.height = height;
    }

    return style;
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown(event) {
    if (!this.context.extras.isEditor) {
      return;
    }

    if (event.code === 'Enter' || event.code === 'Space') {
      this.onDoubleClick();
    }
  }

  /**
   * Handle click.
   */
  onClick() {
    if (this.props.sceneIsDragging) {
      return;
    }

    if (this.props.forceClickHandler || !this.context.extras.isEditor) {
      this.props.clickHandler();

      // Reset button focus state when changing scenes or opening content
      this.setState({ innerButtonFocused: false });
    }
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
   * Set focus to relevant button element.
   * @param {boolean} preventCameraMovement If true, don't move camera on focus.
   */
  setFocus(preventCameraMovement = false) {
    if (preventCameraMovement) {
      this.context.threeSixty?.setPreventCameraMovement(true);
    }

    /*
     * In editor, wrapper needs to get focus, or DragNBar context menu is not
     * available when selecting button. In the view, button needs to get focus
     * or after closing modal the scene will lose focus.
     */
    const focusElement = this.context.extras.isEditor ?
      this.navButtonWrapper?.current :
      this.navButton?.current;

    focusElement?.focus({ preventScroll: true });
  }

  /**
   * Handle focus.
   */
  handleFocus() {
    if (this.props.onFocus) {
      if (this.skipFocus) {
        this.skipFocus = false;
      }
      else {
        this.props.onFocus();
      }
    }
  }

  /**
   * Handle expand button focus.
   */
  handleExpandButtonFocus() {
    this.setState({ expandButtonFocused: true });

    if (this.props.onFocusedInteraction) {
      this.props.onFocus();
    }
  }

  /**
   * Set hotspot size.
   * @param {number} widthX Width.
   * @param {number} heightY Height.
   */
  setHotspotValues(widthX, heightY) {
    const scene = this.context.params.scenes.find(
      (scene) => scene.sceneId === this.props.sceneId,
    );
    const interaction = scene.interactions[this.props.interactionIndex];
    interaction.hotspotSettings.hotSpotSizeValues = `${widthX},${heightY}`;
  }

  /**
   * Get hotspot size.
   * @returns {number[]} Width, height.
   */
  getHotspotValues() {
    const interaction = this.getCurrentInteraction();

    return interaction.hotspotSettings.hotSpotSizeValues.split(',');
  }

  /**
   * Get current Interaction based on current scene id and current interaction id.
   * @returns {object} Interaction.
   */
  getCurrentInteraction() {
    const scene = this.context.params.scenes.find((scene) => {
      return scene.sceneId === this.props.sceneId;
    });

    return scene?.interactions ?
      scene.interactions[this.props.interactionIndex] :
      null;
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    const interaction = this.getCurrentInteraction();

    const machineName = interaction ? H5P.libraryFromString(interaction?.action?.library ?? '').machineName : '';
    const libraryName = machineName.replace('.', '-').toLowerCase();
    let wrapperClasses = interaction ? ['nav-button-wrapper', libraryName] : ['nav-button-wrapper'];

    if (this.props.wasConvertedFromVirtualTour) {
      wrapperClasses = wrapperClasses.concat('was-converted-from-virtual-tour');
    }

    if (this.props.buttonClasses) {
      wrapperClasses = wrapperClasses.concat(this.props.buttonClasses);
    }

    if (this.props.icon) {
      wrapperClasses.push(this.props.icon);
    }

    if (interaction?.isAnswered) {
      wrapperClasses.push('h5p-interaction-answered');
    }

    if (this.props.is3d) {
      wrapperClasses = wrapperClasses.concat('nav-btn-hotspot render-in-3d');
    }

    if (this.state.isMouseOver) {
      wrapperClasses.push('hover');
    }

    // only apply custom focus if we have children that are shown on focus
    if (this.state.isFocused && this.props.children) {
      wrapperClasses.push('focused');
    }

    // Add classname to current active element (wrapper, button or expand label button) so it can be shown on top
    if (this.state.isFocused && this.props.children
      || this.state.expandButtonFocused
      || this.state.innerButtonFocused) {
      wrapperClasses.push('active-element');
    }

    const isWrapperTabbable = this.context.extras.isEditor;
    const isInnerButtonTabbable = !this.context.extras.isEditor
      && !this.props.isHiddenBehindOverlay;

    const label = this.props.label ?
      this.props.label :
      { labelPosition: 'inherit', showLabel: 'inherit' };

    const labelText = getLabelText(label);
    const labelPos = getLabelPos(this.context.behavior.label, label);
    const hoverLabel = isHoverLabel(this.context.behavior.label, label);

    let width;
    let height;

    if (this.props.label && this.props.staticScene && this.props.showAsHotspot) {
      width = parseFloat(this.getHotspotValues()[0].toString());
      height = parseFloat(this.getHotspotValues()[1].toString());

      if (this.props.zoomScale) {
        width *= this.props.zoomScale;
        height *= this.props.zoomScale;
      }
    }

    return (
      <div
        ref={this.navButtonWrapper}
        className={wrapperClasses.join(' ')}
        style={this.getStyle(width, height)}
        tabIndex={isWrapperTabbable ? 0 : undefined}
        onFocus={this.handleFocus.bind(this)}
        onClick={this.onClick.bind(this)}
        onKeyDown={this.handleKeyDown.bind(this)}
        onBlur={this.onBlur.bind(this)}
      >
        {
          this.props.showAsHotspot ?
            <HotspotNavButton
              reference={this.navButton}
              style={{ height:'100%', width:'100%' }}
              ariaLabel={getLabelText(label) || this.context.l10n.untitled}
              tabIndexValue={isInnerButtonTabbable ? undefined : -1}
              onDoubleClickEvent={this.onDoubleClick.bind(this)}
              onMouseDownEvent={this.onMouseDown.bind(this)}
              onFocusEvent={() => this.setState({ innerButtonFocused: true })}
              onBlurEvent={() => this.setState({ innerButtonFocused: false })}
              resizeOnDrag={this.resizeOnDrag}
              setHotspotValues={this.setHotspotValues.bind(this)}
              getHotspotValues={this.getHotspotValues.bind(this)}
              staticScene={this.props.staticScene}
              isPanorama={this.context.extras.isPanorama}
              showHotspotOnHover={this.props.showHotspotOnHover}
              isHotspotTabbable={this.props.isHotspotTabbable}
            />
            :
            <button
              ref={this.navButton}
              aria-label={ getLabelText(label) || this.props.title }
              className='nav-button'
              tabIndex={isInnerButtonTabbable ? undefined : -1}
              onDoubleClick={this.onDoubleClick.bind(this)}
              onMouseDown={this.onMouseDown.bind(this)}
              onFocus={() => this.setState({ innerButtonFocused: true })}
              onBlur={() => this.setState({ innerButtonFocused: false })}/>
        }
        {this.props.children}
        {
          this.props.icon !== 'h5p-go-back-button' && labelText !== '' && !this.props.showAsHotspot &&
          <NavigationButtonLabel
            labelText={labelText}
            labelPos={labelPos}
            hoverOnly={hoverLabel}
            onMount={this.props.onMount}
            forwardRef={this.expandButton}
            onFocus={this.handleExpandButtonFocus.bind(this)}
            onBlur={() => this.setState({ expandButtonFocused: false })}
            topPosition={this.props.topPosition * this.props.wrapperHeight / 100}
            wrapperHeight={this.props.wrapperHeight}
            leftPosition={this.props.leftPosition}
            navButtonHeight={this.navButton.current ? this.navButton.current.offsetHeight : null}
            staticScene={this.props.staticScene}
            navButtonFocused={this.state.innerButtonFocused}
            rendered={this.props.rendered}
            onDoubleClick={this.onDoubleClick.bind(this)}
            zoomScale={this.props.zoomScale}
          />}

      </div>
    );
  }
}
NavigationButton.contextType = H5PContext;
