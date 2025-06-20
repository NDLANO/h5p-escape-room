import React from 'react';
import './HotspotNavButtonResizer.scss';
import HotspotNavButtonResizerKnob from './HotspotNavButtonResizerKnob.js';
import HotspotNavButton from './HotspotNavButton.js';

export default class HotspotNavButtonResizer extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.hotspotReference = React.createRef();

    const geometry = this.props.getHotspotGeometry();
    this.state = {
      sizeWidth : geometry.width,
      sizeHeight : geometry.height,
    };
  }

  updateSize(geometry) {
    this.props.resizeOnDrag(geometry);
    this.setState({ sizeWidth: geometry.width, sizeHeight: geometry.height });
  }

  renderKnob(position) {
    return (
      <HotspotNavButtonResizerKnob
        key={position}
        position={position}
        resizeOnDrag={this.updateSize.bind(this)}
        reference={this.hotspotReference}
        isStaticScene={this.props.isStaticScene}
        isPanoramaScene={this.props.isPanoramaScene}
        getHotspotGeometry={this.props.getHotspotGeometry}
      />
    );
  }

  render() {
    const hotspotButtonProps = this.props.hotspotButtonProps;
    hotspotButtonProps.sizeWidth = this.state.sizeWidth ?? this.props.width;
    hotspotButtonProps.sizeHeight = this.state.sizeHeight ?? this.props.height;
    hotspotButtonProps.innerReference = this.hotspotReference;

    const knobPositions = [
      'top-left', 'top-center', 'top-right',
      'middle-left', 'middle-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    ];

    return <div
      className={'hotspot-nav-button-resizer'}
      onMouseDown={this.props.onMouseDownEvent}
      onMouseUp={this.props.onMouseUpEvent}
    >
      <HotspotNavButton
        {...hotspotButtonProps}
      />
      { this.props.isEditor && (
        <>
          <div
            // TODO: Add a class for this element
            className={'hotspot-nav-button-resizer-sizegiver'}
            style={{
              'position': 'absolute',
              'width': '100%',
              'height': '100%',
              'top': '0',
              'border': '2px solid var(--resizer-color)',
              'boxSizing': 'border-box'
            }}
          />
          {knobPositions.map(this.renderKnob.bind(this))}
        </>
      )}
    </div>;
  }
}
