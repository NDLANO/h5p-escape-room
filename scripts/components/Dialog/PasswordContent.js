import React from 'react';
import { H5PContext } from '../../context/H5PContext.js';
import PropTypes from 'prop-types';
import './PasswordContent.scss';

/**
 * Utilize focus on input reference.
 * @returns {object} Reference object with setFocus function.
 */
const utilizeFocus = () => {
  const ref = React.createRef();
  const setFocus = () => {
    ref.current?.focus();
  };

  return { setFocus, ref };
};

export default class PasswordContent extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.inputRef = utilizeFocus();
    this.state = {
      unlocked: false,
      hasClicked: false,
      shakeClass: '',
      inputPassword: '',
    };

    this.codeFieldLabelId = `field-code-${H5P.createUUID()}-${this.props.currentInteractionIndex}`;
  }

  /**
   * Handle change event of password input field.
   * @param {Event} event Change event of input field.
   */
  handleOnChange(event) {
    this.setState({ inputPassword: event.target.value });
  }

  /**
   * Handle click on password button.
   * @param {PointerEvent} event Event.
   */
  handleOnClick(event) {
    event.preventDefault();
    this.setState({
      hasClicked: true,
    });
    if (this.props.currentInteraction.unlocked) {
      this.props.showInteraction(this.props.currentInteractionIndex);
    }
    else {
      const isCorrectPassword = this.handlePassword(this.state.inputPassword);

      this.props.updateEscapeScoreCard(isCorrectPassword);

      this.setState({
        unlocked: isCorrectPassword,
      });
      if (!this.props.currentInteraction.unlocked) {
        this.shakeIcon();
      }
    }
  }

  /**
   * Check correctness of password.
   * @param {string} inputPassword Password that was entered.
   * @returns {boolean} True, if password was correct.
   */
  handlePassword(inputPassword) {
    const interaction = this.props.currentInteraction;

    const passwords = interaction.passwordSettings.interactionPassword
      .toLowerCase().split('/');

    const isCorrectPassword = passwords.includes(inputPassword.toLowerCase());
    interaction.unlocked = interaction.unlocked || isCorrectPassword;

    if (!isCorrectPassword) {
      this.props.read(this.context.l10n.wrongCode);
    }
    else {
      this.props.read(this.context.l10n.contentUnlocked);
    }

    return isCorrectPassword;
  }

  /**
   * Shake icon.
   */
  shakeIcon() {
    this.setState({ shakeClass: 'h5p-password-icon--shake' });
  }

  /**
   * React render function.
   * @returns {object} JSX object.
   */
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
            onAnimationEnd={() => {
              this.setState({ shakeClass: '' });
            }}
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
                onChange={this.handleOnChange.bind(this)}
              />
            </div>
            {this.props.hint && (
              <div className={'h5p-field-text'}>
                <span className="h5p-password-hint-label">{`${this.context.l10n.hint}: `}</span>
                <div className="h5p-password-hint" dangerouslySetInnerHTML={{ __html: this.props.hint }} />
              </div>
            )}
          </label>
          <button className={'h5p-password-btn'} onClick={this.handleOnClick.bind(this)}>
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

PasswordContent.propTypes = {
  currentInteraction: PropTypes.shape({
    unlocked: PropTypes.bool.isRequired,
    passwordSettings: PropTypes.shape({
      interactionPassword: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  currentInteractionIndex: PropTypes.number.isRequired,
  showInteraction: PropTypes.func.isRequired,
  updateEscapeScoreCard: PropTypes.func.isRequired,
  hint: PropTypes.string,
  read: PropTypes.func.isRequired,
};
