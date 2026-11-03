import React, { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { H5PContext } from '../../../context/H5PContext.js';
import './OverviewMap.scss';

/**
 * Get aspect ratio of image.
 * @param {number} [width] Width of image.
 * @param {number} [height] Height of image.
 * @returns {number|undefined} Aspect ratio, undefined if it cannot be determined.
 */
const getAspectRatio = (width, height) => {
  return (width > 0 && height > 0) ? width / height : undefined;
};

/**
 * Render overview map with marker for position of current scene.
 * @param {object} props Component props.
 * @param {object} props.image Image parameters of overview map.
 * @param {object} [props.position] Position of current scene with x and y in percent.
 * @param {string} [props.markerColor] Color of marker, default color of stylesheet if not set.
 * @param {string} props.label Accessible name of overview map.
 * @param {boolean} [props.isNextToZoomButtons] If true, leave space for zoom buttons on the right.
 * @returns {React.Element} Rendered overview map.
 */
const OverviewMap = ({ image, position, markerColor, label, isNextToZoomButtons = false }) => {
  const context = useContext(H5PContext);

  // Image parameters may lack dimensions, natural size of image is used then
  const [naturalAspectRatio, setNaturalAspectRatio] = useState();
  const aspectRatio = getAspectRatio(image.width, image.height) ?? naturalAspectRatio;

  const hasPosition = typeof position?.x === 'number' && typeof position?.y === 'number';

  return (
    <div
      className={ `hud-panel overview-map-panel${isNextToZoomButtons ? ' next-to-zoom-buttons' : ''}` }
      role="region"
      aria-label={ label }
    >
      <div
        className="overview-map-image-wrapper"
        style={ { '--overview-map-aspect-ratio': aspectRatio } }
      >
        <img
          className="overview-map-image"
          src={ H5P.getPath(image.path, context.contentId) }
          alt=""
          onLoad={ (event) => {
            setNaturalAspectRatio(
              getAspectRatio(event.target.naturalWidth, event.target.naturalHeight)
            );
          } }
        />
        {
          hasPosition &&
          <div
            className="overview-map-marker"
            style={ {
              left: `${position.x}%`,
              top: `${position.y}%`,
              backgroundColor: markerColor || undefined
            } }
          />
        }
      </div>
    </div>
  );
};

OverviewMap.propTypes = {
  image: PropTypes.shape({
    path: PropTypes.string.isRequired,
    width: PropTypes.number,
    height: PropTypes.number
  }).isRequired,
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number
  }),
  markerColor: PropTypes.string,
  label: PropTypes.string.isRequired,
  isNextToZoomButtons: PropTypes.bool
};

export default OverviewMap;
