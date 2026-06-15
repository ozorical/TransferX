export const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error))

export const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))
