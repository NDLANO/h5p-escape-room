import React from 'react';
import { H5PContext } from '../../context/H5PContext.js';
import PropTypes from 'prop-types';

export default class SceneTotalScores extends React.Component {

  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;
  }

  /**
   * Build scene title.
   * @param {number} sceneId Scene id.
   * @param {string} sceneTitle Scene title.
   * @returns {string} Scene title with name or number if not set.
   */
  buildSceneTitle(sceneId, sceneTitle) {
    if (sceneTitle !== undefined && sceneTitle !== '') {
      return `${this.context.l10n.scene}: ${sceneTitle}`;
    }

    return `${this.context.l10n.scene}: ${sceneId}`;
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    const sceneTitle = this.buildSceneTitle(
      this.props.sceneId, this.props.sceneScores.title
    );

    const items = [];
    for (
      const [scoreId, score] of Object.entries(this.props.sceneScores.scores)
    ) {
      items.push(
        <tr key={scoreId}>
          <td
            className="h5p-td h5p-summary-task-title"
          >
            {score.title ? score.title : this.context.l10n.untitled}
          </td>
          <td
            className="h5p-td h5p-summary-score-bar"
          >
            {score.raw}/{score.max}
          </td>
        </tr>
      );
    }

    return (
      <tbody>
        <tr>
          <td
            className="h5p-td h5p-summary-task-title"
            colSpan={2}
          >
            {sceneTitle}
          </td>
        </tr>
        {items}
      </tbody>
    );
  }
}

SceneTotalScores.contextType = H5PContext;

SceneTotalScores.propTypes = {
  sceneId: PropTypes.string.isRequired,
  sceneScores: PropTypes.shape({
    title: PropTypes.string,
    scores: PropTypes.objectOf(
      PropTypes.shape({
        title: PropTypes.string,
        raw: PropTypes.number.isRequired,
        max: PropTypes.number.isRequired
      })
    ).isRequired
  }).isRequired
};
