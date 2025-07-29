import React from 'react';
import { H5PContext } from '../../context/H5PContext';
import ThreeSixtyScene from './SceneTypes/ThreeSixtyScene';
import StaticScene from './SceneTypes/StaticScene';

export const SceneTypes = {
  THREE_SIXTY_SCENE: '360',
  STATIC_SCENE: 'static',
  PANORAMA: 'panorama',
  PREVIOUS_SCENE: -1,
};

export default class Scene extends React.Component {
  /**
   * @class
   * @param {object} props React properties.
   */
  constructor(props) {
    super(props);
    this.props = props;
  }

  /**
   * React component did update.
   * @param {object} prevProps Props before update.
   */
  componentDidUpdate(prevProps) {
    if (!this.props.sceneDescriptionARIA) {
      return; // No scene description to read
    }

    // (Re-)Read scene description when (re-)entering
    if (!prevProps.isActive && this.props.isActive) {
      this.wasSceneDescriptionAnnounced = false;
    }

    // Read scene description
    if (
      this.props.isActive &&
      !this.wasSceneDescriptionAnnounced &&
      !this.props.isHiddenBehindOverlay
    ) {
      this.props.read(this.props.sceneDescriptionARIA);
      this.wasSceneDescriptionAnnounced = true;
    }
  }

  /**
   * Get interaction title.
   * @param {object} action Action.
   * @returns {string} Title.
   */
  getInteractionTitle(action) {
    const machineName = H5P.libraryFromString(action.library)?.machineName;
    if (machineName === 'H5P.GoToScene') {
      return this.context.params.scenes.find((scene) => {
        return scene.sceneId === action.params.nextSceneId;
      })?.scenename ?? this.context.l10n.untitled;
    }

    return action.metadata.title ?? this.context.l10n.untitled;
  }

  /**
   * React render function.
   * @returns {object} JSX element.
   */
  render() {
    if (this.props.sceneParams.sceneType === SceneTypes.STATIC_SCENE) {
      return (
        <StaticScene
          wasConvertedFromVirtualTour={this.props.wasConvertedFromVirtualTour}
          zoomPercentage={this.props.zoomPercentage}
          isActive={this.props.isActive}
          isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
          nextFocus={ this.props.nextFocus }
          takeFocus={ this.props.takeFocus }
          sceneParams={this.props.sceneParams}
          imageSrc={this.props.imageSrc}
          navigateToScene={this.props.navigateToScene.bind(this)}
          showInteraction={this.props.showInteraction.bind(this)}
          sceneHistory={this.props.sceneHistory}
          audioIsPlaying={ this.props.audioIsPlaying }
          sceneId={ this.props.sceneId }
          onBlurInteraction={this.props.onBlurInteraction}
          onFocusedInteraction={this.props.onFocusedInteraction}
          focusedInteraction={this.props.focusedInteraction}
          sceneWaitingForLoad={this.props.sceneWaitingForLoad}
          doneLoadingNextScene={this.props.doneLoadingNextScene}
          getInteractionTitle={this.getInteractionTitle.bind(this)}
          zoomScale={this.props.zoomScale}
          zoomIn={this.props.zoomIn}
          zoomOut={this.props.zoomOut}
          enableZoom={this.props.sceneParams.enableZoom}
          maxZoomedIn={ this.props.maxZoomedIn }
          maxZoomedOut={ this.props.maxZoomedOut }
        />
      );
    }

    return (
      <ThreeSixtyScene
        zoomPercentage={this.props.zoomPercentage}
        threeSixty={this.props.threeSixty}
        updateThreeSixty={this.props.updateThreeSixty}
        isActive={this.props.isActive}
        isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
        nextFocus={ this.props.nextFocus }
        takeFocus={ this.props.takeFocus }
        sceneIcons={this.props.sceneIcons}
        sceneParams={this.props.sceneParams}
        addThreeSixty={ this.props.addThreeSixty }
        setReactRoots={ this.props.setReactRoots }
        getReactRoots={ this.props.getReactRoots }
        reactRoots={ this.props.reactRoots }
        imageSrc={this.props.imageSrc}
        navigateToScene={this.props.navigateToScene.bind(this)}
        forceStartCamera={this.props.forceStartCamera}
        showInteraction={this.props.showInteraction.bind(this)}
        audioIsPlaying={ this.props.audioIsPlaying }
        sceneId={ this.props.sceneId }
        toggleCenterScene={ this.props.toggleCenterScene }
        onSetCameraPos={ this.props.onSetCameraPos }
        onBlurInteraction={this.props.onBlurInteraction}
        onFocusedInteraction={this.props.onFocusedInteraction}
        focusedInteraction={this.props.focusedInteraction}
        isEditingInteraction={this.props.isEditingInteraction}
        sceneWaitingForLoad={this.props.sceneWaitingForLoad}
        doneLoadingNextScene={this.props.doneLoadingNextScene}
        startBtnClicked={this.props.startBtnClicked}
        isPanorama={this.props.sceneParams.sceneType === SceneTypes.PANORAMA}
        enableZoom={this.props.sceneParams.enableZoom}
        getInteractionTitle={this.getInteractionTitle.bind(this)}
        show360Affordance={ this.props.show360Affordance }
        on360AffordanceDone={ this.props.on360AffordanceDone }
      />
    );
  }
}

Scene.contextType = H5PContext;
