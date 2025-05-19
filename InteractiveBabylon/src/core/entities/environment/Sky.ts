import { float, ReflectionProbe, Scene } from "@babylonjs/core";
import { Animation } from "@babylonjs/core/Animations";
import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import { SkyMaterial } from "@babylonjs/materials/sky";
import { ReflectingMesh } from "./ReflectingMesh";


export enum SkyConfigParameter {
    Inclination = "material.inclination",
    Luminance = "material.luminance",
    Turbidity = "material.turbidity",
    CameraOffsetY = "material.cameraOffset.y",
}

// TODO: reflectionProbes, for realistic reflections.
//  => https://doc.babylonjs.com/features/featuresDeepDive/environment/reflectionProbes/

export class Sky {
    private skyMaterial: SkyMaterial;
    private skyMesh: ReflectingMesh<Mesh>;
    private skyBox: Mesh;

    constructor(scene: Scene, name = "skyBox",) {
        // https://doc.babylonjs.com/toolsAndResources/assetLibraries/materialsLibrary/skyMat/
        this.skyMaterial = new SkyMaterial("skyMaterial", scene);
        this.skyMaterial.backFaceCulling = false;
        // this.skyMaterial._cachedDefines.FOG = true;
        this.skyMaterial.rayleigh = 1.5; // Represents global sky appearance
        // Mie scattering (from [Gustav Mie](https://en.wikipedia.org/wiki/Gustav_Mie))
        // Related to the haze particles in atmosphere
        // The amount of haze particles following the Mie scattering theory
        this.skyMaterial.mieDirectionalG = 0.86;
        this.skyMaterial.mieCoefficient = 0.005; // The mieCoefficient in interval [0, 0.1], affects the property this.skyMaterial.mieDirectionalG

        this.skyMaterial.inclination = 0; // daylight.

        this.skyBox = MeshBuilder.CreateBox(
            name,
            { size: 1000 },
            scene,
        );
        this.skyBox.material = this.skyMaterial;

        this.skyBox.infiniteDistance = true;  // as you want to see it from everywhere.
        // this.skyMesh = new ReflectingMesh<Mesh>(skyBox, scene);
        // TODO: Test this.. (should work without additional light)
        // scene.environmentTexture = this.skyMesh.reflectionProbe.cubeTexture;

        const envProbe = new ReflectionProbe("skyEnvironmentProbe", 512, scene);
        if (envProbe.renderList) {
            envProbe.renderList.push(this.skyBox); 
            // Nur die Skybox in dieser Probe rendern..
        }
        scene.environmentTexture = envProbe.cubeTexture;

        this.skyBox.isVisible = true;

        // this.setDay();
    }

    public getSkyBox() {
        return this.skyBox;
    }

    // Luminance ist ein Maß für die Helligkeit von Licht.
    // Turbidity ist ein Maß für die Trübung eines Mediums.
    setSkyConfig(property: SkyConfigParameter, from: float, to: float) {
        var keys = [
            { frame: 0, value: from },
            { frame: 100, value: to }
        ];

        var transition = new Animation(
            "animation", property,
            100, // Does change speed via framerate..
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        transition.setKeys(keys);

        const scene = this.getSkyBox().getScene()
        
        scene.stopAnimation(this);
        scene.beginDirectAnimation(
            /* on */ this,
            [transition],
            0, 100, false,
            1 // speedRatio.
        );
    }

    // Daytime oriented sky-setting
    setMorning() {
        this.setSkyConfig(
            SkyConfigParameter.Inclination,
            (this.skyMaterial as SkyMaterial).inclination,
            0.5
        )
    }

    setDay() {
        this.setSkyConfig(
            SkyConfigParameter.Inclination,
            (this.skyMaterial as SkyMaterial).inclination,
            0.2
        )
    }

    setEvening() {
        this.setSkyConfig(
            SkyConfigParameter.Inclination,
            (this.skyMaterial as SkyMaterial).inclination,
            -0.5
        )
    }

    setNight() {
        this.setSkyConfig(
            SkyConfigParameter.Inclination,
            (this.skyMaterial as SkyMaterial).inclination,
            -1 // TODO: Right?
        )
    }


    // TODO: Default Daylight Cycle? (Not req. for now)

}