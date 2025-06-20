import React from 'react';
import './NavigationButton.scss';
import { H5PContext } from '../../context/H5PContext';
import { clamp } from '../../utils/utils';

export default class HotspotNavButton extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;
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
    const iconSize = clamp(20, Math.min(this.props.sizeWidth / 2, this.props.sizeHeight / 2), 40);

    return (
      <div
        className={`nav-button-hotspot-wrapper ${this.props.staticScene ? 'nav-button-hotspot-wrapper--is-static' : ''} `}
        style={this.props.staticScene ? { height:'100%', width:'100%' } : {}}>
        <button
          aria-label={this.props.ariaLabel}
          style={this.props.staticScene ?
            { width: '100%', height: '100%', fontSize: iconSize } :
            { width: `${this.props.sizeWidth}px`, height: `${this.props.sizeHeight}px`, fontSize: iconSize }
          }
          className={ `nav-button nav-button-hotspot ${this.props.showHotspotOnHover ? 'nav-button-hotspot--show-hotspot-on-hover' : ''} ${this.context.extras.isEditor ? 'nav-button-hotspot--editor' : ''} `}
          tabIndex={this.determineTabIndex()}
          onClick={this.props.onClickEvent}
          onDoubleClick={this.props.onDoubleClickEvent}
          onFocus={this.props.onFocusEvent}
          onBlur={this.props.onBlurEvent}
          ref={this.props.innerReference}
        />
      </div>
    );
  }
}
HotspotNavButton.contextType = H5PContext;
