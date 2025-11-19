import React from 'react';
import './Screenreader.scss';
import PropTypes from 'prop-types';

/**
 * @class
 */
export default class Screenreader extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    return (
      <div
        className='screenreader'
        aria-live='polite'
      >
        { this.props.readText }
      </div>
    );
  }
}

Screenreader.propTypes = {
  readText: PropTypes.string.isRequired,
};
