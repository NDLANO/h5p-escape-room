import { extend, purifyHTML } from './utils.js';

/**
 * Set interaction defaults.
 * @param {object} interactions Scene parameters.
 * @returns {object} Sanitized scene parameters.
 */
const setInteractionDefaults = (interactions) => {
  interactions = interactions.map((interaction) => {
    interaction = extend({
      label: {
        labelPosition: 'inherit',
        showLabel: 'inherit'
      },
      ...(interaction.showAsHotspot && {
        hotspotSettings: {
          isHotspotTabbable: true,
          hotSpotSizeValues: '256,128'
        },
        iconTypeTextBox: 'text-icon'
      })
    }, interaction);

    // Add unique id as key for mapping React components.
    if (!interaction.id) {
      interaction.id = H5P.createUUID();
    }

    return interaction;
  });

  return interactions;
};

/**
 * Set scene defaults.
 * @param {object} sceneParams Scene parameters.
 * @returns {object} Sanitized scene parameters.
 */
const setSceneDefaults = (sceneParams) => {
  return sceneParams
    .filter((sceneParam) => !!sceneParam.scenesrc) // Should only happen if subcontent in visual editor
    .map((sceneParam, index) => {
      // Will break when extending or "cloning", some reference somewhere
      sceneParam.sceneType = sceneParam.sceneType ?? '360';
      sceneParam.showBackButton = sceneParam.showBackButton ?? true;
      sceneParam.sceneName = sceneParam.sceneName ?? `${index}`; // Should only happen if subcontent in visual editor
      sceneParam.showSceneDescriptionInitially = sceneParam.showSceneDescriptionInitially ?? false;
      sceneParam.interactions = sceneParam.interactions ?? [];
      sceneParam.iconType = sceneParam.iconType ?? 'arrow';
      sceneParam.audioType = sceneParam.audioType ?? 'audio';
      sceneParam.restartAudioOnSceneStart = sceneParam.restartAudioOnSceneStart ?? false;

      // Sanitize scene description aria that was entered as HTML
      if (sceneParam.sceneDescriptionARIA) {
        sceneParam.sceneDescriptionARIA =
          purifyHTML(sceneParam.sceneDescriptionARIA);
      }

      // Sanitize interactions
      sceneParam.interactions =
        setInteractionDefaults(sceneParam.interactions);

      return sceneParam;
    });
};

/**
 * Sanitize the content type's parameters.
 * @param {object} params Parameters.
 * @returns {object} Sanitized parameters.
 */
export const sanitizeContentTypeParameters = (params = {}) => {
  params = extend({
    threeImage: {
      scenes: [],
      startSceneId: 0
    },
    behaviour: {
      audioType: 'audio',
      showScoresButton: false,
      showHomeButton: true,
      sceneRenderingQuality: 'high',
      label: {
        labelPosition: 'right',
        showLabel: true
      },
      tabOrderMode: 'none'
    },
    l10n: {
      title: 'Virtual Tour',
      playAudioTrack: 'Play Audio Track',
      pauseAudioTrack: 'Pause Audio Track',
      sceneDescription: 'Scene Description',
      resetCamera: 'Reset Camera',
      submitDialog: 'Submit Dialog',
      closeDialog: 'Close Dialog',
      expandButtonAriaLabel: 'Expand the visual label',
      goToStartScene: 'Go to start scene',
      userIsAtStartScene: 'You are at the start scene',
      unlocked: 'Unlocked',
      locked: 'Locked',
      searchRoomForCode: 'Search the room until you find the code',
      wrongCode: 'The code was wrong, try again.',
      contentUnlocked: 'The content has been unlocked!',
      code: 'Code',
      showCode: 'Show code',
      hideCode: 'Hide code',
      unlockedStateAction: 'Continue',
      lockedStateAction: 'Unlock',
      hotspotDragHorizAlt: 'Drag horizontally to scale hotspot',
      hotspotDragVertiAlt: 'Drag vertically to scale hotspot',
      backgroundLoading: 'Loading background image...',
      noContent: 'No content',
      hint: 'Hint',
      lockedContent: 'Locked content',
      back: 'Back',
      buttonFullscreenEnter: 'Enter fullscreen mode',
      buttonFullscreenExit: 'Exit fullscreen mode',
      noValidScenesSet: 'No valid scenes have been set.',
      buttonZoomIn: 'Zoom in',
      buttonZoomOut: 'Zoom out',
      zoomToolbar: 'Zoom toolbar',
      zoomAria: ':num% zoomed in',
    }
  }, params);

  params.threeImage.scenes = setSceneDefaults(params.threeImage.scenes);

  // Sanitize localization
  for (const key in params.l10n) {
    params.l10n[key] = purifyHTML(params.l10n[key]);
  }

  return params;
};
