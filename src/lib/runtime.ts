export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function describeRuntimeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("reading 'invoke'") || message.includes('TAURI_INTERNALS')) {
    return 'This action requires the Tauri desktop or mobile runtime.';
  }
  if (message === 'Failed to fetch') {
    return 'Unable to reach the provider. Check the base URL and network connection.';
  }
  return message;
}
