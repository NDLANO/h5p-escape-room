import React, { Component } from 'react';
import './ContextMenu.scss';
import { H5PContext } from '../../context/H5PContext.js';
import PropTypes from 'prop-types';

export default class ContextMenu extends Component {

  /**
   * Go to scene.
   */
  goToScene() {
    this.context.trigger('goToScene', this.props.interactionIndex);
  }

  /**
   * Edit interaction.
   */
  handlEdit() {
    this.context.trigger('editInteraction', this.props.interactionIndex);
  }

  /**
   * Delete interaction.
   */
  handleDelete() {
    this.context.trigger('deleteInteraction', this.props.interactionIndex);
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    return (
      <div className='context-menu'>
        {
          this.props.isGoToScene &&
          <button
            className='go-to-scene'
            onClick={this.goToScene.bind(this)}
            tabIndex="-1"
          >
            {this.context.extras.l10n && (
              <div
                className='tooltip'
                dangerouslySetInnerHTML={{
                  __html: this.context.extras.l10n.goToScene
                }}
              />
            )}
          </button>
        }
        <button
          className='edit'
          onClick={this.handlEdit.bind(this)}
          tabIndex="-1"
        >
          {this.context.extras.l10n && (
            <div
              className='tooltip'
              dangerouslySetInnerHTML={{ __html: this.context.extras.l10n.edit }}
            />
          )}
        </button>
        <button
          className='delete'
          onClick={this.handleDelete.bind(this)}
          tabIndex="-1"
        >
          {this.context.extras.l10n && (
            <div
              className='tooltip'
              dangerouslySetInnerHTML={{ __html: this.context.extras.l10n.delete }}
            />
          )}
        </button>
      </div>
    );
  }
}

ContextMenu.propTypes = {
  interactionIndex: PropTypes.number.isRequired,
  isGoToScene: PropTypes.bool.isRequired,
};

ContextMenu.contextType = H5PContext;
