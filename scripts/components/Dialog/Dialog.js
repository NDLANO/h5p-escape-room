import React from 'react';
import './Dialog.scss';
import FocusTrap from '../../utils/focus-trap';
import { H5PContext } from '../../context/H5PContext';

export default class Dialog extends React.Component {
  constructor(props) {
    super(props);

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

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
   * Handle React component will unmount.
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

  handleDialogRef = (el) => {
    if (el) {
      this.el = el;
    }
  };

  handleResize = () => {
    if (this.el) {
      this.el.style.width = '';
      this.el.style.height = this.el.getBoundingClientRect().height + 'px';
    }
  };

  /**
   * Handle keydown on dialog.
   *
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown(event) {
    if (event.code === 'Escape') {
      this.props.onHideTextDialog();
    }
  }

  render() {
    let dialogClasses = ['h5p-text-dialog'];
    if (this.props.dialogClasses) {
      dialogClasses = dialogClasses.concat(this.props.dialogClasses);
    }

    const children = (this.props.children.type === 'div' ? this.props.children : React.Children.map(this.props.children, (child) =>
      React.cloneElement(child, {
        onResize: this.handleResize
      })
    ));

    return (
      <div
        className='h5p-text-overlay'
        role='dialog'
        aria-labelledby={ 'h5p-dialog-label' }
        aria-modal={ 'true' }
        ref={ this.overlayRef }
        onKeyDown={ this.handleKeyDown }
      >
        <div id='h5p-dialog-label' className="h5p-dialog-label">
          { this.props.title }
        </div>
        <div className={dialogClasses.join(' ')} ref={ this.handleDialogRef }>
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
