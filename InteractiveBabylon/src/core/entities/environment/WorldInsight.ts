import { Camera, FlyCamera, Scene, Vector3 } from "@babylonjs/core";


export class WorldInsight {
    static createView(
        scene: Scene,
        initialOrientation = new Vector3(0, 20,-20),
        cameraName = "PrimaryCamera"
      ): Camera {
    
        const camera = new FlyCamera(
          cameraName,
          initialOrientation,
          scene
        );

        camera.rotation.x += Math.PI / 16;
    
        // Airplane like rotation, with faster roll correction and banked-turns.
        // Default is 100. A higher number means slower correction.
        camera.rollCorrect = 15;
        // Default is false.
        camera.bankedTurn = false;
        // Defaults to 90° in radians in how far banking will roll the camera.
        camera.bankedTurnLimit = Math.PI / 2;
        // How much of the Yawing (turning) will affect the Rolling (banked-turn.)
        // Less than 1 will reduce the Rolling, and more than 1 will increase it.
        camera.bankedTurnMultiplier = 0.5;
        camera.speed = 1.6;
    
        return camera;
      }
}