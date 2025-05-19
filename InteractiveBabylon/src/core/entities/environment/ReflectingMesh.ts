import {
    Scene,
    AbstractMesh,
    ReflectionProbe,
    PBRMaterial,
    Material,
    Nullable,
    Color3,
} from "@babylonjs/core";

export class ReflectingMesh<T extends AbstractMesh> {
    public readonly mesh: T;
    public readonly reflectionProbe: ReflectionProbe;
    public readonly pbrMaterial: PBRMaterial;
    private readonly originalMaterial: Nullable<Material> = null;

    /**
     * Creates an instance of MeshReflectionProbeEnhancer.
     * Converts the mesh's material to a PBRMaterial and adds a ReflectionProbe.
     * @param mesh The mesh to enhance.
     * @param meshesToReflect A list of meshes to be visible in the reflection of this mesh.
     * @param probeOptions Optional settings for the ReflectionProbe.
     * @param pbrOptions Optional settings for the PBRMaterial.
     */
    constructor(
        mesh: T,
        meshesToReflect?: AbstractMesh[],
        probeOptions: { size?: number, refreshRate?: number } = {},
        pbrOptions: { metallic?: number, roughness?: number, albedoColor?: Color3 } = {}
    ) {
        this.mesh = mesh;

        this.originalMaterial = mesh.material;
        const probeSize = probeOptions.size ?? 512;
        // const probeRefreshRate = probeOptions.refreshRate
        //     ?? ReflectionProbe.REFRESHRATE_RENDER_ONCE; // Standard: Einmal rendern
        this.reflectionProbe = new ReflectionProbe(
            `${mesh.name}_reflectionProbe`,
            probeSize,
            this.mesh.getScene()
        );

        // Position der Probe (oft am Mesh-Ursprung oder leicht davor/darüber)
        this.reflectionProbe.attachToMesh(this.mesh); // Bindet Position an Mesh-Position
        // Alternativ: this.reflectionProbe.position = this.mesh.getAbsolutePosition();

        // --- create PBR Material ---
        this.pbrMaterial = new PBRMaterial(`${mesh.name}_reflectivePBR`, this.mesh.getScene());
        this.pbrMaterial.reflectionTexture = this.reflectionProbe.cubeTexture;
        this.pbrMaterial.metallic = pbrOptions.metallic ?? 0.8; // Standard: Eher metallisch
        this.pbrMaterial.roughness = pbrOptions.roughness ?? 0.2; // Standard: Eher glatt
        this.pbrMaterial.albedoColor = pbrOptions.albedoColor ?? (
            (this.originalMaterial && 'diffuseColor' in this.originalMaterial)
                ? (this.originalMaterial as any).diffuseColor // Versuche Farbe vom Original zu übernehmen
                : new Color3(0.8, 0.8, 0.8) // default to gray
        );
        this.pbrMaterial.environmentIntensity = 1.0; // Wie stark die Umgebung (Probe + scene.env) beiträgt
        this.pbrMaterial.reflectionTexture.level = 1.0; // Stärke der Reflexionen selbst

        // Neues Material dem Mesh zuweisen
        this.mesh.material = this.pbrMaterial;

        if (meshesToReflect) {
            this.shouldReflect(meshesToReflect);
        } else {
            this.reflectionProbe.renderList = [];
        }
    }


    public shouldReflect(meshesToReflect: AbstractMesh[]): void {
        if (!this.reflectionProbe.renderList) {
            console.error(
                `Cannot update ReflectionProbe on '${this.mesh.name}', if not initialized.`
            );
            return;
        }

        for (const mesh of meshesToReflect) {
            if (mesh !== this.mesh) {  // do not reflect self, but everyone else.
                this.reflectionProbe.renderList?.push(mesh);
            }
        }

        // Wichtig: Nach Änderung der Renderliste muss die Probe neu rendern,
        // falls die refreshRate nicht auf ONCE steht und sich nichts anderes geändert hat.
        // Bei REFRESHRATE_RENDER_ONCE muss man manuell ein Update triggern,
        // was aber hier weniger Sinn macht, da die Liste ja gerade geändert wurde.
        // Wenn die Rate höher ist, passiert es automatisch. Wenn sie ONCE ist,
        // und man *später* die Liste ändert, bräuchte man eine manuelle Neuberechnung.
    }


    public dispose(restoreOriginalMaterial: boolean = false): void {
        if (restoreOriginalMaterial) {
            this.mesh.material = this.originalMaterial;
        } else {
            // Wenn das PBR Material nicht wiederhergestellt wird, sollte es auch entsorgt werden
            this.pbrMaterial.dispose();
        }

        this.reflectionProbe.dispose();

        (this as any).mesh = null;
        (this as any).reflectionProbe = null;
        (this as any).pbrMaterial = null;
        (this as any).originalMaterial = null;
    }
}