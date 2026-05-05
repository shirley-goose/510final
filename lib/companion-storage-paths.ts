/** Paths stored by `persistGeneratedOutputs` in `app/api/generate/route.ts`. */
export function companionModelObjectPaths(userId: string, companionId: string): string[] {
  return [`models/${userId}/${companionId}.glb`, `models/${userId}/${companionId}/preview.png`];
}
