export function pipeline(context, middleware, index) {
  const nextMiddleware = middleware[index];
  if (!nextMiddleware) {
    return context.next;
  }
  return (...args) => {
    context.next(...args);
    const nextPipeline = pipeline(context, middleware, index + 1);
    nextMiddleware({ ...context, next: nextPipeline });
  };
}
