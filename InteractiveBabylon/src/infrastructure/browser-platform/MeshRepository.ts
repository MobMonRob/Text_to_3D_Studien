import { AbstractMesh, ImportMeshAsync, Mesh, Scene } from "@babylonjs/core";
import { GLTF2Export } from "@babylonjs/serializers";

/**
 * Static repository for managing Babylon.js meshes
 */
export class MeshRepository {
  private static get allowedFileExtensions() {
    return ["glb", "gltf", "obj", "babylon", "stl"];
  }

  /**
   * Creates an input element for file uploads
   * @returns HTMLInputElement configured for file uploads
   */
  private static createFileInput(): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = this.allowedFileExtensions
      .map((extension) => "." + extension).join(",");
    input.style.display = "none";

    document.body.appendChild(input);
    return input;
  }

  /**
   * Uploads a mesh file from the user's device
   * @param scene The Babylon scene to add the mesh to
   * @returns Promise resolving to the key-mesh pair
   */
  public static uploadMeshFile(
    scene: Scene,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const fileInput = this.createFileInput();

      fileInput.onchange = async (event) => {
        try {
          const target = event.target as HTMLInputElement;
          const files = target.files;

          if (!files || files.length === 0) {
            throw new Error("No file selected");
          }

          const file = files[0];
          const fileExtension = file.name.split(".").pop()?.toLowerCase();
          const fileName = file.name.split(".")[0];

          if (
            !fileExtension ||
            !this.allowedFileExtensions.includes(fileExtension)
          ) {
            throw new Error("Unsupported file format");
          }

          // Load the file into the scene
          const result = await ImportMeshAsync(
            file,
            scene,
          );
          // TODO: Mesh not visible in World?!
          //        => maybe einfach ein zstl. placeInWorld machen?!

          // Get the first mesh
          if (
            result.meshes.length === 0 ||
            !(result.meshes[0] instanceof Mesh)
          ) {
            throw new Error("No valid mesh found in file");
          }

          console.log(result);

          // Cleanup
          document.body.removeChild(fileInput);

          resolve();
        } catch (error) {
          document.body.removeChild(fileInput);
          reject(error);
        }
      };

      fileInput.click();
    });
  }

  /**
   * Downloads a mesh to the user's device
   * @param key Unique identifier of the mesh to download
   */
  public static downloadMesh(mesh: AbstractMesh): void {
    GLTF2Export.GLBAsync(
      mesh.getScene(),
      mesh.name ?? "NewMesh_" + Date.now(),
      { shouldExportNode: (node) => node.name == mesh.name },
    ).then((glb) => glb.downloadFiles())
      .catch((reason) =>
        console.error("Cannot export your Mesh, due to..", reason)
      );
  }
}
