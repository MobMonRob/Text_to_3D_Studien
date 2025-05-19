import {
    AbstractMesh,
    FresnelParameters,
    Material,
    PBRMaterial,
    RandomGUID,
    ReflectionProbe,
    Scene,
    StandardMaterial
} from "@babylonjs/core";


export class UnifiedModel <T extends AbstractMesh> {
    // Whats to be unified?
    private mesh: T;
    private probe: ReflectionProbe;


    constructor(
        mesh: T, scene: Scene,
        name?: string,
        material?: Material,
        ownReflectionProbe?: ReflectionProbe,
    ) {
        // 1. Material
        // 2. Reflection Probe
        // 3. reflect other Meshes
        let nameSuffix = "";
        if (!name) {
            name = "UModel"
            nameSuffix = `_${RandomGUID().substring(0, 8)}`
        }

        this.mesh = mesh;

        if (!material) {
            let material = new StandardMaterial(`${name}_material${nameSuffix}`, scene);
            material.reflectionFresnelParameters = new FresnelParameters({ bias: 0.03 })
        }

        const pbrMaterial = new PBRMaterial(`${name}${nameSuffix}`, scene);
        // pbrMaterial.reflectionTexture = mesh.material;
        pbrMaterial.roughness = 0.1;
        this.mesh.material = pbrMaterial;


        if (ownReflectionProbe) {
            this.probe = ownReflectionProbe;
        } else {
            this.probe = new ReflectionProbe(`${name}_reflectionProbe${nameSuffix}`, 512, scene);
        }

        this.probe.attachToMesh(this.mesh);
    }

    public async shouldReflect(mesh: AbstractMesh) {
        if (mesh && mesh.name !== this.mesh.name) {
            this.probe.renderList.push(mesh);
        }
    }

    public async shouldReflectAll(meshes: AbstractMesh[]) {
        meshes.forEach(this.shouldReflect)

    }

    public static async shouldReflectEachOther(models: UnifiedModel<AbstractMesh>[]) {
        models.forEach((rootModel) => {
            models.forEach((reflectionModel) => {
                rootModel.shouldReflect(reflectionModel.mesh);
            })
        })
    }

}