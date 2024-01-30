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

/**
 * @typedef {{
 *   isActive: boolean;
 *   isHiddenBehindOverlay: boolean;
 *   nextFocus: string;
 *   takeFocus: boolean;
 *   sceneIcons: { id: number; iconType: string; }[];
 *   imageSrc: string;
 *   navigateToScene: () => void;
 *   showInteraction: () => void;
 *   sceneHistory: Array<any>;
 *   audioIsPlaying: boolean;
 *   sceneId: number;
 *   onBlurInteraction: () => void;
 *   onFocusedInteraction: () => void;
 *   focusedInteraction: number;
 *   sceneWaitingForLoad: number;
 *   doneLoadingNextScene: boolean;
 *   updateScoreCard: () => void;
 *   sceneParams: SceneParams;
 *   threeSixty: any;
 *   updateThreeSixty: boolean;
 *   addThreeSixty: (threeSixty: any) => void;
 *   forceStartCamera: boolean;
 *   toggleCenterScene: boolean;
 *   onSetCameraPos: (cameraPosition: CameraPosition) => void;
 *   isEditingInteraction: boolean;
 *   startBtnClicked: (event: MouseEvent) => void;
 * }} Props
 */

export default class Scene extends React.Component {
  /**
   * @param {Props} props
   */
  constructor(props) {
    super(props);
  }

  /**
   * React component did update.
   *
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

  render() {
    if (this.props.sceneParams.sceneType === SceneTypes.STATIC_SCENE) {
      return (
        <StaticScene
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
        />
      );
    }

    return (
      <ThreeSixtyScene
        threeSixty={this.props.threeSixty}
        updateThreeSixty={this.props.updateThreeSixty}
        isActive={this.props.isActive}
        isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
        nextFocus={ this.props.nextFocus }
        takeFocus={ this.props.takeFocus }
        sceneIcons={this.props.sceneIcons}
        sceneParams={this.props.sceneParams}
        addThreeSixty={ this.props.addThreeSixty }
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
      />
    );
  }
}
Scene.contextType = H5PContext;
