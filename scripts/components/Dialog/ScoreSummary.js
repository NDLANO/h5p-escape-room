import React from 'react';
import Dialog from './Dialog';
import SceneScores from './SceneScores';
import { H5PContext } from '../../context/H5PContext';
import './ScoreSummary.scss';

export default class ScoreSummary extends React.Component {
  constructor(props) {
    super(props);
  }

  /**
   * Get total scores of all scenes.
   *
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

  componentDidMount() {
    const totalScores = this.getTotalScores(this.props.scores.sceneScoreCards);
    const scoreBar = new H5P.JoubelScoreBar(totalScores.max, 'label', 'helpText', 'scoreExplanationButtonLabel');
    scoreBar.setScore(totalScores.score);
    const wrapper = H5P.jQuery('#total-scores');
    scoreBar.appendTo(wrapper);
  }

  render() {
    const items = [];
    for (const [sceneId, sceneScores] of Object.entries(this.props.scores.sceneScoreCards)) {
      items.push(<SceneScores key={sceneId} sceneId={sceneId} sceneScores={sceneScores}></SceneScores>);
    }
    const children = (
      <div className="h5p-summary-table-pages">
        <table className="h5p-score-table">
          <thead>
            <tr>
              <th className="h5p-summary-table-header slide">{this.context.l10n.assignment}</th>
              <th className="h5p-summary-table-header score">{this.context.l10n.score} <span>/</span> {this.context.l10n.total.toLowerCase()}</th>
            </tr>
          </thead>
          {items}
          <tfoot>
            <tr><td className="h5p-td h5p-summary-task-title">Total:</td><td id="total-scores" className="h5p-td h5p-summary-score-bar"></td></tr>
          </tfoot>
        </table>
      </div>);

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
