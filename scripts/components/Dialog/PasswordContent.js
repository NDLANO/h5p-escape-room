import React from 'react';
import { H5PContext } from '../../context/H5PContext';
import './PasswordContent.scss';

const utilizeFocus = () => {
  const ref = React.createRef();
  const setFocus = () => {
    ref.current &&  ref.current.focus();
  };

  return { setFocus, ref };
};

export default class PasswordContent extends React.Component {
  constructor(props) {
    super(props);
    this.inputRef = utilizeFocus();
    this.state = {
      unlocked: false,
      hasClicked: false,
      shakeClass: '',
      inputPassword: '',
    };

    this.codeFieldLabelId = `field-code-${H5P.createUUID()}-${this.props.currentInteractionIndex}`;
  }
  handleOnChange = (event) => {
    this.setState({
      inputPassword: event.target.value,
    });
  };
  handleOnClick = (event) => {
    event.preventDefault();
    this.setState({
      hasClicked: true,
    });
    if (this.props.currentInteraction.unlocked) {
      this.props.showInteraction(this.props.currentInteractionIndex);
    }
    else {
      this.props.updateEscapeScoreCard(this.props.handlePassword(this.state.inputPassword));

      this.setState({
        unlocked: this.props.handlePassword(this.state.inputPassword),
      });
      if (!this.props.currentInteraction.unlocked) {
        this.shakeIcon();
      }
    }
  };

  shakeIcon = () => {
    this.setState({
      shakeClass: 'h5p-password-icon--shake',
    });
    setTimeout(() => {
      this.setState({
        shakeClass: '',
      });
    }, 500);
  };

  render() {
    return (
      <div className="h5p-password-content">
        <div
          className={`h5p-password-icon-wrapper ${
            this.state.unlocked
              ? 'h5p-password-icon-wrapper--correct-code'
              : !this.state.hasClicked
                ? ''
                : 'h5p-password-icon-wrapper--wrong-code'
          }`}
        >
          <span
            className={`h5p-password-icon ${
              this.state.unlocked ? 'unlocked' : 'locked'
            } ${this.state.shakeClass}`}
          />
        </div>
        <div className='h1'>
          {this.state.unlocked
            ? this.context.l10n.unlocked
            : this.context.l10n.locked}
        </div>

        {
          <span
            className={`h5p-field-description ${
              this.state.unlocked
                ? 'h5p-field-description--correct-code'
                : !this.state.hasClicked
                  ? ''
                  : 'h5p-field-description--wrong-code'
            }`}
          >
            {this.state.unlocked
              ? this.context.l10n.contentUnlocked
              : !this.state.hasClicked
                ? this.context.l10n.searchRoomForCode
                : this.context.l10n.wrongCode}
          </span>
        }
        <form className={'h5p-wrapper'} onSubmit={this.handleSubmit}>
          <label
            className={'h5p-wrapper'}
            htmlFor={this.codeFieldLabelId}
          >
            <div className={'h5p-wrapper-inner'}>
              <input
                autoFocus
                type="text"
                autoComplete="off"
                ref={this.inputRef.ref}
                className="h5p-field-input"
                id={this.codeFieldLabelId}
                placeholder={this.context.l10n.code}
                value={this.state.inputPassword}
                onChange={this.handleOnChange}
              />
            </div>
            {this.props.hint && (
              <div className={'h5p-field-text'}>
                <span className="h5p-password-hint-label">{`${this.context.l10n.hint}: `}</span>
                <div className="h5p-password-hint" dangerouslySetInnerHTML={{ __html: this.props.hint }} />
              </div>
            )}
          </label>
          <button className={'h5p-password-btn'} onClick={this.handleOnClick}>
            {this.state.unlocked
              ? this.context.l10n.unlockedStateAction
              : this.context.l10n.lockedStateAction}
          </button>
        </form>
      </div>
    );
  }
}

PasswordContent.contextType = H5PContext;
