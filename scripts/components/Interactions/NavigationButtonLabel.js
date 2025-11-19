import React from 'react';
import './NavigationButton.scss';
import './NavigationButtonLabel.scss';
import { H5PContext } from '../../context/H5PContext.js';
import { willOverflow } from '../Shared/OverflowHelpers.js';
import PropTypes from 'prop-types';

/**
 * Get label position.
 * @param {object} globalLabel Global label.
 * @param {object} label Local label.
 * @returns {string} Label position.
 */
export const getLabelPos = (globalLabel, label) => {
  const useLabelPosition = label?.labelPosition !== 'inherit';

  return useLabelPosition ? label.labelPosition : globalLabel.labelPosition;
};

/**
 * Get label text.
 * @param {object} label Label.
 * @returns {string} Label text.
 */
export const getLabelText = (label) => {
  return label?.labelText ?? '';
};

/**
 * Get label position.
 * @param {object} globalLabel Global label.
 * @param {object} label Local label.
 * @returns {boolean} True, if is hover label, else false.
 */
export const isHoverLabel = (globalLabel, label) => {
  return (label.showLabel === 'inherit') ?
    !globalLabel.showLabel :
    label.showLabel !== 'show';
};

// Threshold for if the label should be multiline
const INNER_LABEL_HEIGHT_THRESHOLD_LOW = 22;

// Threshold for if the label should be expandeble
const INNER_LABEL_HEIGHT_THRESHOLD_HIGH = 44;

export default class NavigationButtonLabel extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.onClick.bind(this);
    this.innerLabelDiv = React.createRef();
    this.navLabel = React.createRef();

    this.state = {
      expandable: false,
      isExpanded: false,
      divHeight: this.getDivHeight(),
      labelPos: this.props.labelPos,
      expandDirection: null,
      alignment: null,
      innerLabelHeight: ''
    };
  }

  /**
   * Handle expand button being clicked.
   * @param {PointerEvent} event Event.
   */
  onClick(event) {
    event.stopPropagation();
    if (!this.state.expandable) {
      return;
    }

    if (!this.state.isExpanded) {
      window.setTimeout(() => {
        this.setState({
          divHeight: this.innerLabelDiv.current ?
            this.innerLabelDiv.current.scrollHeight :
            0,
          isExpanded: true
        });
      }, 0);
    }
    else {
      window.setTimeout(() => {
        this.setState({ divHeight: this.getDivHeight(), isExpanded: false });
      }, 0);
    }
  }

  /**
   * React life-cycle handler: Component did update.
   * @param {object} prevProps React props before update.
   */
  componentDidUpdate(prevProps) {
    // Need to calculate if expand button should be shown and height
    if (
      this.props.labelText !== prevProps.labelText ||
      this.props.hoverOnly !== prevProps.hoverOnly
    ) {
      this.setHeightProperties();
    }

    /*
     * Need to calculate if alignment and expanddirection should be changed
     * Only in static scene label can overflow, since camera can be moved in 360
     */
    if (
      (
        this.props.topPosition !== prevProps.topPosition ||
        this.props.leftPosition !== prevProps.leftPosition ||
        this.props.labelText !== prevProps.labelText
      ) && this.props.staticScene
    ) {
      this.setExpandProperties();
    }

    if (!prevProps.rendered && this.props.rendered && this.props.staticScene) {
      this.setHeightProperties();
      this.setExpandProperties();
    }
  }

  /**
   * React life-cycle handler: Component did mount.
   */
  componentDidMount() {
    window.setTimeout(() => {
      this.setHeightProperties();
      if (this.props.staticScene) {
        this.setExpandProperties();
      }
    }, 50);

    this.context.on('resize', () => {
      if (
        this.state.isExpanded &&
        this.innerLabelDiv.current &&
        this.state.divHeight !== this.innerLabelDiv.current.scrollHeight
      ) {
        // Font size changes when screen resizes so ensure correct height
        if (
          this.innerLabelDiv.current.scrollHeight !== 0 && this.props.staticScene
        ) {
          this.setState({
            divHeight: this.innerLabelDiv.current ?
              this.innerLabelDiv.current.scrollHeight :
              0
          });
        }
        /*
         * If interaction doesn't have scrollheight and is expanded, we have
         * moved scene. Interactions in 360 scene are not properly remounted and
         * this leads to labels being expanded and not proparly shown when going
         * back.
         */
        else if (
          !this.props.staticScene &&
          (this.state.isExpanded || this.state.divHeight !== '3em')
        ) {
          this.setState({
            isExpanded: false,
            divHeight: '3em'
          });
        }
      }
    });
  }

  /**
   * React life-cycle handler: Component is about to unmount.
   */
  componentWillUnmount() {
    this.context.off('resize', () => {
      if (
        this.state.isExpanded &&
        this.innerLabelDiv.current &&
        this.state.divHeight !== this.innerLabelDiv.current.scrollHeight
      ) {
        this.setState({
          divHeight: this.innerLabelDiv.current ?
            this.innerLabelDiv.current.scrollHeight :
            0
        });
      }
    });
  }

  /**
   * Set height properties.
   */
  setHeightProperties() {
    const isExpandable = this.isExpandable();

    this.setState({
      expandable: isExpandable,
      divHeight: this.getDivHeight(),
      /*
       * Safari won't show ellipsis unless height is 100%
       * Ellipsis should only be shown if it is expandable
       * If not the calculated height will be incorrect
       */
      innerLabelHeight: isExpandable ? '100%' : ''
    });
  }

  /**
   * Set expand properties.
   */
  setExpandProperties() {
    /*
     * Only set expand properties when not zoomed in to avoid
     * labels toggling when moving image within the wrapper.
     */
    if (this.props.zoomScale !== 1) {
      return;
    }

    const labelProperties = this.getOverflowProperties();

    if (labelProperties.expandDirection !== this.state.expandDirection) {
      this.setState({ expandDirection: labelProperties.expandDirection });
    }

    if (labelProperties.alignment !== this.state.alignment) {
      this.setState({ alignment: labelProperties.alignment });
    }
  }

  /**
   * Return height of div based on scrollHeight.
   * @returns {number|null} Height of div or null.
   */
  getDivHeight() {
    if (!this.innerLabelDiv.current) {
      return null;
    }

    // Scrollheight will be incorrect if height === 100%, therefore we reset
    this.innerLabelDiv.current.style.height = '';

    /*
     * // TODO: Check what these hardcoded values introduced by H5P Group
     * originally are based on and potentially replace with CSS class.
     * Not urgent.
     */
    return (
      this.innerLabelDiv.current.scrollWidth >
        this.innerLabelDiv.current.offsetWidth ||
      this.innerLabelDiv.current.scrollHeight >
        INNER_LABEL_HEIGHT_THRESHOLD_LOW
    ) ?
      '3em' :
      '1.5em';
  }

  /**
   * Determine if element can be expanded.
   * @returns {boolean} True, if element can be expanded, else false.
   */
  isExpandable() {
    /*
     * If not fully loaded, scrollheight might be wrong, therefore check if it
     * is too wide and two lines
     */
    return (
      this.innerLabelDiv.current.scrollHeight >
        INNER_LABEL_HEIGHT_THRESHOLD_HIGH ||
      (
        this.getDivHeight() === '3em' &&
        this.innerLabelDiv.current.scrollWidth >
          this.innerLabelDiv.current.offsetWidth * 2
      )
    );
  }

  /**
   * Calculate if element will overflow when expanded.
   * @returns {boolean} True if element will overflow when expanded, else false.
   */
  getOverflowProperties() {
    let height = this.innerLabelDiv.current.scrollHeight;

    // Get right height from top of navigation button for entire label
    if (this.props.labelPos === 'top') {
      height += parseInt(
        window.getComputedStyle(this.navLabel.current).paddingTop
      );
    }
    else if (this.props.labelPos === 'bottom') {
      height += parseInt(this.props.navButtonHeight) +
        parseInt(window.getComputedStyle(this.navLabel.current).paddingTop);
    }
    else {
      height += parseInt(
        window.getComputedStyle(this.navLabel.current).paddingTop
      ) +
      parseInt(window.getComputedStyle(this.navLabel.current).paddingBottom);
    }

    if (this.state.expandable && !this.props.hoverOnly) {
      height += parseInt(
        window.getComputedStyle(this.props.forwardRef.current).paddingTop
      );
    }

    const overflowChanges = willOverflow(this.props.labelPos,
      height,
      this.props.topPosition,
      this.props.leftPosition,
      this.props.wrapperHeight);

    return overflowChanges;
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    const hoverOnly = this.props.hoverOnly ? 'hover-only' : '';
    const isExpanded = this.state.isExpanded ? 'is-expanded' : '';
    const canExpand = this.state.expandable ? 'can-expand' : '';
    const isMultline = (this.state.divHeight !== '1.5em') ? 'is-multiline' : '';
    const expandDirection = this.state.expandDirection && canExpand ?
      'expand-' + this.state.expandDirection :
      '';
    const alignment = this.state.alignment || this.props.labelPos;
    const showLabel = this.props.navButtonFocused &&
      !this.context.extras.isEditor ?
      'show-label' :
      '';

    const expandButtonTabIndex = !this.context.extras.isEditor
      && this.props.isHiddenBehindOverlay ? '-1' : undefined;

    return (
      <div
        className={`nav-label-container
        ${alignment}
        ${isExpanded}
        ${canExpand}
        ${hoverOnly}
        ${expandDirection}
        ${isMultline}
        ${showLabel}
        `}
        onDoubleClick={this.props.onDoubleClick}
      >
        <div
          style={{ height: this.state.divHeight }}
          aria-hidden='true'
          className={'nav-label'}
          ref={this.navLabel}>
          <div
            ref={this.innerLabelDiv}
            // Safari won't show ellipsis unless height is 100%
            style={{ height: this.state.innerLabelHeight }}
            className='nav-label-inner'
            dangerouslySetInnerHTML={{ __html: this.props.labelText }}>
          </div>
        </div>
        {canExpand && !hoverOnly &&
          <button
            onFocus={() => this.props.onFocus(true)}
            onBlur={() => this.props.onBlur(false)}
            ref={this.props.forwardRef}
            className="nav-label-expand-button"
            tabIndex={expandButtonTabIndex}
            aria-label={this.context.l10n.expandButtonAriaLabel}
            onClick={this.onClick.bind(this)}>
            <div className="nav-label-expand-arrow" />
          </button>}
      </div>
    );
  }
}

NavigationButtonLabel.contextType = H5PContext;

NavigationButtonLabel.propTypes = {
  labelText: PropTypes.string.isRequired,
  labelPos: PropTypes.string.isRequired,
  topPosition: PropTypes.number.isRequired,
  leftPosition: PropTypes.number.isRequired,
  wrapperHeight: PropTypes.number.isRequired,
  navButtonHeight: PropTypes.string.isRequired,
  hoverOnly: PropTypes.bool.isRequired,
  navButtonFocused: PropTypes.bool.isRequired,
  staticScene: PropTypes.bool.isRequired,
  zoomScale: PropTypes.number.isRequired,
  rendered: PropTypes.bool.isRequired,
  isHiddenBehindOverlay: PropTypes.bool.isRequired,
  forwardRef: PropTypes.object.isRequired,
  onDoubleClick: PropTypes.func.isRequired,
  onFocus: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
};
