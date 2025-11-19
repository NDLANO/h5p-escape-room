import React from 'react';
import './Dialog.scss';
import FocusTrap from '../../utils/focus-trap.js';
import { H5PContext } from '../../context/H5PContext.js';
import PropTypes from 'prop-types';

export default class Dialog extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.dialogLabelId = `h5p-dialog-label-${H5P.createUUID()}`;
  }

  /**
   * React life-cycle handler: component did mount.
   */
  componentDidMount() {
    /*
     * Focus trap to keep focus inside dialog modal. Will focus first tabbable
     * element if `takeFocus` is true (= default except for first page load).
     */
    this.initializeFocusTrap();

    // Handle Escape key to close dialog as dialog modal should
    window.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * React life-cycle handler: component is about to be unmounted.
   */
  componentWillUnmount() {
    this.focusTrap.deactivate();
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Initialize focus trap.
   */
  initializeFocusTrap() {
    this.focusTrap = new FocusTrap({
      trapElement: this.el,
      takeFocus: this.props.takeFocus,
      closeElement: this.closeButton,
      fallbackContainer: this.el
    });

    this.focusTrap.activate();
  }

  /**
   * Handle dialog reference.
   * @param {object} element Element.
   */
  handleDialogRef(element) {
    if (element) {
      this.el = element;
    }
  }

  /**
   * Handle resize.
   */
  handleResize() {
    if (this.el) {
      this.el.style.width = '';
      this.el.style.height = `${this.el.getBoundingClientRect().height}px`;
    }
  }

  /**
   * Handle keydown on dialog.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown(event) {
    if (event.code === 'Escape') {
      this.props.onHideTextDialog();
    }
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    let dialogClasses = ['h5p-text-dialog'];
    if (this.props.dialogClasses) {
      dialogClasses = dialogClasses.concat(this.props.dialogClasses);
    }

    const children = (
      this.props.children.type === 'div'
        ? this.props.children
        : React.Children.map(
          this.props.children,
          (child) =>
            React.cloneElement(child, {
              onResize: this.handleResize.bind(this)
            })
        )
    );

    return (
      <div
        className='h5p-text-overlay'
        role='dialog'
        aria-labelledby={ this.dialogLabelId }
        aria-modal={ 'true' }
        ref={ this.overlayRef }
        onKeyDown={ this.handleKeyDown }
      >
        <div id={this.dialogLabelId} className="h5p-dialog-label">
          { this.props.title }
        </div>
        <div className={dialogClasses.join(' ')} ref={ this.handleDialogRef.bind(this) }>
          <div className='h5p-text-content'>
            { children }
          </div>
          <button
            ref={ (el) => this.closeButton = el }
            aria-label={ this.context.l10n.closeDialog }
            className='close-button-wrapper'
            onClick={ this.props.onHideTextDialog }
          />
        </div>
      </div>
    );
  }
}

Dialog.contextType = H5PContext;

Dialog.propTypes = {
  title: PropTypes.string.isRequired,
  onHideTextDialog: PropTypes.func.isRequired,
  dialogClasses: PropTypes.arrayOf(PropTypes.string),
  takeFocus: PropTypes.bool,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired
};

Dialog.defaultProps = {
  dialogClasses: [],
  takeFocus: true
};
