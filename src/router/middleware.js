/**
 * Vue Router middleware pipeline.
 * Each middleware receives `next` that either continues the chain or
 * (when called with arguments) aborts/redirects via the real router next.
 */
export function pipeline(context, middleware, index) {
  const nextMiddleware = middleware[index];
  if (!nextMiddleware) {
    return context.next;
  }

  return (...args) => {
    // Redirect / abort — skip remaining middleware
    if (args.length > 0) {
      return context.next(...args);
    }

    const nextPipeline = pipeline(context, middleware, index + 1);
    return nextMiddleware({ ...context, next: nextPipeline });
  };
}
