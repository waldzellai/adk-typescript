// Base artifact service module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base artifact service functionality from the Python SDK

// BaseArtifactService class mirroring the Python implementation
export abstract class BaseArtifactService {
  /**
   * Saves an artifact to the artifact service storage.
   * 
   * @param appName The application name
   * @param userId The user ID
   * @param sessionId The session ID
   * @param filename The filename of the artifact
   * @param artifact The artifact to save
   * @returns The revision ID (first version is 0, incremented by 1 after each save)
   */
  abstract saveArtifact(appName: string, userId: string, sessionId: string, filename: string, artifact: unknown): number;

  /**
   * Gets an artifact from the artifact service storage.
   * 
   * @param appName The application name
   * @param userId The user ID
   * @param sessionId The session ID
   * @param filename The filename of the artifact
   * @param version Optional version of the artifact (if undefined, latest version is returned)
   * @returns The artifact or null if not found
   */
  abstract loadArtifact(appName: string, userId: string, sessionId: string, filename: string, version?: number): unknown | null;

  /**
   * Lists all the artifact filenames within a session.
   * 
   * @param appName The application name
   * @param userId The user ID
   * @param sessionId The session ID
   * @returns A list of all artifact filenames within a session
   */
  abstract listArtifactKeys(appName: string, userId: string, sessionId: string): string[];

  /**
   * Deletes an artifact.
   * 
   * @param appName The application name
   * @param userId The user ID
   * @param sessionId The session ID
   * @param filename The filename of the artifact
   */
  abstract deleteArtifact(appName: string, userId: string, sessionId: string, filename: string): void;

  /**
   * Lists all versions of an artifact.
   * 
   * @param appName The application name
   * @param userId The user ID
   * @param sessionId The session ID
   * @param filename The filename of the artifact
   * @returns A list of all available versions of the artifact
   */
  abstract listVersions(appName: string, userId: string, sessionId: string, filename: string): number[];
}

// InMemoryArtifactService class mirroring the Python implementation
export class InMemoryArtifactService extends BaseArtifactService {
  private artifacts: Map<string, unknown[]> = new Map();

  constructor() {
    super();
  }

  private fileHasUserNamespace(filename: string): boolean {
    return filename.startsWith('user:');
  }

  private artifactPath(appName: string, userId: string, sessionId: string, filename: string): string {
    if (this.fileHasUserNamespace(filename)) {
      return `${appName}/${userId}/user/${filename}`;
    }
    return `${appName}/${userId}/${sessionId}/${filename}`;
  }

  saveArtifact(appName: string, userId: string, sessionId: string, filename: string, artifact: unknown): number {
    const path = this.artifactPath(appName, userId, sessionId, filename);
    let versions = this.artifacts.get(path);
    if (!versions) {
      versions = [];
      this.artifacts.set(path, versions);
    }
    versions.push(artifact);
    return versions.length - 1;
  }

  loadArtifact(appName: string, userId: string, sessionId: string, filename: string, version?: number): unknown | null {
    const path = this.artifactPath(appName, userId, sessionId, filename);
    const versions = this.artifacts.get(path);
    if (!versions || versions.length === 0) {
      return null;
    }
    if (version === undefined) {
      return versions[versions.length - 1];
    }
    if (version < 0 || version >= versions.length) {
      return null;
    }
    return versions[version];
  }

  listArtifactKeys(appName: string, userId: string, sessionId: string): string[] {
    const sessionPrefix = `${appName}/${userId}/${sessionId}/`;
    const usernamespacePrefix = `${appName}/${userId}/user/`;
    const filenames: string[] = [];
    
    for (const path of this.artifacts.keys()) {
      if (path.startsWith(sessionPrefix)) {
        const filename = path.slice(sessionPrefix.length);
        filenames.push(filename);
      } else if (path.startsWith(usernamespacePrefix)) {
        const filename = path.slice(usernamespacePrefix.length);
        filenames.push(filename);
      }
    }
    
    return filenames.sort();
  }

  deleteArtifact(appName: string, userId: string, sessionId: string, filename: string): void {
    const path = this.artifactPath(appName, userId, sessionId, filename);
    this.artifacts.delete(path);
  }

  listVersions(appName: string, userId: string, sessionId: string, filename: string): number[] {
    const path = this.artifactPath(appName, userId, sessionId, filename);
    const versions = this.artifacts.get(path);
    if (!versions) {
      return [];
    }
    return Array.from({ length: versions.length }, (_, i) => i);
  }
}
