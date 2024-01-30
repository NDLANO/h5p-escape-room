import React from 'react';
import './Screenreader.scss';

/**
 * @class
 */
export default class Screenreader extends React.Component {
  constructor(props) {
    super(props);
  }

  /**
   * Render.
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
