import React from 'react';
import './InteractionContent.scss';
import { H5PContext } from '../../context/H5PContext.js';
import { isVideoAudio } from '../../utils/audio-utils.js';
import PropTypes from 'prop-types';

export default class InteractionContent extends React.Component {
  /**
   * @class
   * @param {object} props React props.
   */
  constructor(props) {
    super(props);
    this.props = props;

    this.state = {
      isInitialized: false,
    };
  }

  /**
   * React life-cycle function: component did update.
   * @param {object} prevProps Props before update.
   */
  componentDidUpdate(prevProps) {
    if (
      this.props.audioIsPlaying &&
      this.props.audioIsPlaying !== prevProps.audioIsPlaying
    ) {
      // The Audio Player has changed

      if (isVideoAudio(prevProps.audioIsPlaying)) {
        // Thas last player was us, we need to stop it

        // NOTE: This is a hack for Panopto embed player bug where the API
        // sends a "play" event to all Panopto players when one is played
        // causing us to think that the audio is changed, when it actually
        // is not.
        // By checking that the new audio source is not a video, we can rule
        // this case out, since two videos can never happen at the same time
        // currently. This can be removed when Panopto has fixed their
        // API. See HFP-3191
        if (!isVideoAudio(this.props.audioIsPlaying)) {
          this.instance.pause();
        }
      }
    }
  }

  /**
   * Make it easy to bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Make it easy to bubble events from parent to children.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets) {
    origin.on(eventName, (event) => {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      targets.forEach((target) => {
        // If not attached yet, some contents can fail (e. g. CP).
        target.trigger(eventName, event);
      });
    });
  }

  /**
   * Initialize content.
   * @param {HTMLElement} contentRef Content DOM reference.
   */
  initializeContent(contentRef) {
    if (!contentRef || this.state.isInitialized) {
      return;
    }

    // Remove any old content
    while (contentRef.firstChild) {
      contentRef.removeChild(contentRef.firstChild);
    }

    const scene = this.context.params.scenes.find((scene) => {
      return scene.sceneId === this.props.currentScene;
    });
    const interaction = scene.interactions[this.props.currentInteraction];
    const library = interaction.action;

    const machineName = interaction.action.library?.split?.(' ')[0];

    if (machineName === 'H5P.Video') {
      interaction.action.params.visuals.fit = (
        interaction.action.params.sources.length && (
          interaction.action.params.sources[0].mime === 'video/mp4' ||
          interaction.action.params.sources[0].mime === 'video/webm' ||
          interaction.action.params.sources[0].mime === 'video/ogg'
        )
      );
    }

    this.instance = H5P.newRunnable(
      library,
      this.context.contentId,
      H5P.jQuery(contentRef)
    );

    if (machineName === 'H5P.Video') {
      this.instance.on('stateChange', (e) => {
        if (e.data === H5P.Video.PLAYING) {
          this.props.onAudioIsPlaying(
            `video-${scene.sceneId}-${this.props.currentInteraction}`
          );
        }
      });
    }

    // Resize parent when children resize
    this.bubbleUp(this.instance, 'resize', this.context);

    // Resize children to fit inside parent
    this.bubbleDown(this.context, 'resize', [this.instance]);

    this.setState({
      isInitialized: true,
    });

    this.instance.on('xAPI', (event) => {
      if (
        event.data.statement.verb.id ===
          'http://adlnet.gov/expapi/verbs/answered'
      ) {
        this.props.updateScoreCard(
          this.props.currentScene,
          this.props.currentInteraction,
          event.data.statement.result.score
        );
      }
    });
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    return (
      <div ref={ (el) => this.initializeContent(el) } />
    );
  }
}

InteractionContent.contextType = H5PContext;

InteractionContent.propTypes = {
  currentScene: PropTypes.number.isRequired,
  currentInteraction: PropTypes.number.isRequired,
  onAudioIsPlaying: PropTypes.func.isRequired,
  updateScoreCard: PropTypes.func.isRequired,
  audioIsPlaying: PropTypes.string.isRequired
};
