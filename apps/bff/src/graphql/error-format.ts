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
  
  if (originalError || exception) {
    const errorInstance = originalError || exception;
    
    if (errorInstance.name === 'UnauthorizedException' || 
        errorInstance.constructor?.name === 'UnauthorizedException') {
      code = 'UNAUTHENTICATED';
    } else if (errorInstance.name === 'ForbiddenException' || 
               errorInstance.constructor?.name === 'ForbiddenException') {
      code = 'FORBIDDEN';
    } else if (errorInstance.name === 'BadRequestException' || 
               errorInstance.constructor?.name === 'BadRequestException') {
      code = 'BAD_USER_INPUT';
    }
  }
  
  // In production, mask internal errors
  if (isProd && code === 'INTERNAL_SERVER_ERROR') {
    message = 'Internal server error';
  }
  
  // Build extensions object
  const extensions: Record<string, any> = {
    code,
    ...error.extensions
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