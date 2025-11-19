import React from 'react';
import Dialog from './Dialog.js';
import SceneScores from './SceneScores.js';
import { H5PContext } from '../../context/H5PContext.js';
import PropTypes from 'prop-types';
import './ScoreSummary.scss';

export default class ScoreSummary extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.scoreBarDOM = React.createRef();
  }

  /**
   * Get total scores of all scenes.
   * @param {object} sceneScoreCards Score cards.
   * @returns {object} Overall score and total score of all scenes.
   */
  getTotalScores(sceneScoreCards) {
    return Object.values(sceneScoreCards)
      .map((item) => [...Object.values(item.scores)])
      .flat()
      .reduce((sum, info) => {
        sum.score += info?.raw ?? 0;
        sum.max += info?.max ?? 0;
        return sum;
      }, { score: 0, max:0 });
  }

  /**
   * React life-cycle handler: component did mount.
   */
  componentDidMount() {
    const totalScores = this.getTotalScores(this.props.scores.sceneScoreCards);
    const scoreBar = new H5P.JoubelScoreBar(
      totalScores.max, 'label', 'helpText', 'scoreExplanationButtonLabel'
    );
    scoreBar.setScore(totalScores.score);
    scoreBar.appendTo(this.scoreBarDOM.current);
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    const items = [];
    for (
      const [sceneId, sceneScores] of
      Object.entries(this.props.scores.sceneScoreCards)
    ) {
      items.push(
        <SceneScores key={sceneId} sceneId={sceneId} sceneScores={sceneScores}>
        </SceneScores>
      );
    }

    const children = (
      <div className="h5p-summary-table-pages">
        <table className="h5p-score-table">
          <thead>
            <tr>
              <th
                className="h5p-summary-table-header slide"
              >
                {this.context.l10n.assignment}
              </th>
              <th
                className="h5p-summary-table-header score"
              >
                {this.context.l10n.score} <span>/</span> {this.context.l10n.total.toLowerCase()}
              </th>
            </tr>
          </thead>
          {items}
          <tfoot>
            <tr>
              <td
                className="h5p-td h5p-summary-task-title"
              >
                Total:
              </td>
              <td
                ref={this.scoreBarDOM}
                className="h5p-td h5p-summary-score-bar"
              >
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );

    return (
      <Dialog
        title={this.props.title}
        onHideTextDialog={this.props.onHideTextDialog}
      >
        {children}
      </Dialog>
    );
  }
}

ScoreSummary.contextType = H5PContext;

ScoreSummary.propTypes = {
  title: PropTypes.string.isRequired,
  onHideTextDialog: PropTypes.func.isRequired,
  scores: PropTypes.shape({
    sceneScoreCards: PropTypes.object.isRequired
  }).isRequired
};
