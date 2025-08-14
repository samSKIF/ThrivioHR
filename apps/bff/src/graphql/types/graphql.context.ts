import { Request } from 'express';

export type GraphQLContext = {
  req: Request;
};