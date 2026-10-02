export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  console.error(error);
  let status = error.statusCode || 500;
  let message = error.message || 'Something went wrong.';
  let details = error.details;

  if (error.name === 'ValidationError') {
    status = 422;
    message = 'Please correct the highlighted data.';
    details = Object.values(error.errors).map((item) => ({ field: item.path, message: item.message }));
  }
  if (error.code === 11000) {
    status = 409;
    const field = Object.keys(error.keyPattern || {})[0] || 'value';
    message = `That ${field} is already in use.`;
  }
  if (error.name === 'CastError') {
    status = 400;
    message = 'An invalid identifier was supplied.';
  }

  res.status(status).json({
    error: {
      message,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV === 'development' && status === 500 ? { stack: error.stack } : {})
    }
  });
}
