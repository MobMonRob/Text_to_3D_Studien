export interface ICredentialRepository {
  /**
   * Get the details of a specific credential.
   * @param credentialName The name of the credential.
   * @returns A promise that resolves to the stored credentials.
   */
  getCredentialSecret(credentialName: string): Promise<any>;
  /**
   * Add a new credential to the repository.
   * @param credentialName The name of the credential.
   * @param credentialDetails The details of the credential.
   * @returns A promise that resolves when the credential is added.
   */
  /* storeCredential(
    credentialName: string,
    credentialDetails: any,
  ): Promise<void>; */
  /**
   * Update an existing credential in the repository.
   * @param credentialName The name of the credential.
   * @param credentialDetails The updated details of the credential.
   * @returns A promise that resolves when the credential is updated.
   */
  /* updateCredential(
    credentialName: string,
    credentialDetails: any,
  ): Promise<void>; */
  /**
   * Delete a credential from the repository.
   * @param credentialName The name of the credential.
   * @returns A promise that resolves when the credential is deleted.
   */
  // deleteCredential(credentialName: string): Promise<void>;
}
