import { GraphQLFormattedError } from 'graphql';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';

export function formatGraphQLError(
  error: GraphQLFormattedError,
  env = process.env.NODE_ENV
): GraphQLFormattedError {
  const isProd = env === 'production';
  
  // Extract the original exception from extensions
  const originalError = error.extensions?.originalError as any;
  const exception = error.extensions?.exception as any;
  
  // Determine error code based on exception type
  let code = 'INTERNAL_SERVER_ERROR';
  let message = error.message;
  
  // Check for common error patterns first
  if (message?.includes('No authorization header') || 
      message?.includes('Invalid token') ||
      message?.includes('Unauthorized')) {
    code = 'UNAUTHENTICATED';
  } else if (originalError || exception) {
    const errorInstance = originalError || exception;
    
    // Check status codes first
    if (errorInstance.statusCode === 401 || errorInstance.error === 'Unauthorized') {
      code = 'UNAUTHENTICATED';
    } else if (errorInstance.statusCode === 403 || errorInstance.error === 'Forbidden') {
      code = 'FORBIDDEN';
    } else if (errorInstance.statusCode === 400 || errorInstance.error === 'Bad Request') {
      code = 'BAD_REQUEST';
      // For specific user input validation errors from HTTP layer that match new patterns
      if (errorInstance.message?.includes('Invalid cursor') || 
          errorInstance.message?.includes('first must be between')) {
        code = 'BAD_USER_INPUT';
      }
    } else if (errorInstance.name === 'UnauthorizedException' || 
        errorInstance.constructor?.name === 'UnauthorizedException') {
      code = 'UNAUTHENTICATED';
    } else if (errorInstance.name === 'ForbiddenException' || 
               errorInstance.constructor?.name === 'ForbiddenException') {
      code = 'FORBIDDEN';
    } else if (errorInstance.name === 'BadRequestException' || 
               errorInstance.constructor?.name === 'BadRequestException') {
      code = 'BAD_REQUEST';
      // Only map new specific user input validation errors to BAD_USER_INPUT
      // Preserve existing BAD_REQUEST behavior for other validation errors
      if (errorInstance.message?.includes('first must be between')) {
        code = 'BAD_USER_INPUT';
      }
    }
  }
  
  // In production, mask internal errors
  if (isProd && code === 'INTERNAL_SERVER_ERROR') {
    message = 'Internal server error';
  }
  
  // Build extensions object - ensure our code takes precedence over original
  const extensions: Record<string, any> = {
    ...error.extensions,
    code  // Our code overrides the original
  };
  
  // In non-production, preserve more debugging info
  if (!isProd) {
    const exceptionData = error.extensions?.exception as any;
    if (exceptionData?.stacktrace) {
      extensions.stacktrace = exceptionData.stacktrace;
    }
  } else {
    // In production, remove sensitive debugging information
    delete extensions.exception;
    delete extensions.stacktrace;
    delete extensions.originalError;
  }
  
  // Always preserve path information for client debugging
  if (error.path) {
    extensions.path = error.path;
  }
  
  return {
    message,
    locations: error.locations,
    path: error.path,
    extensions
  };
}