import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgScopeGuard } from '../auth/org-scope.guard';
import { SocialService, CreatePostInput, CreateRecognitionInput } from './social.service';

@Resolver()
@UseGuards(JwtAuthGuard, OrgScopeGuard)
export class SocialResolver {
  constructor(private readonly socialService: SocialService) {}

  @Query('posts')
  async posts(
    _: unknown,
    args: { limit?: number; cursor?: string },
    @Context() ctx: { req: Request & { orgId: string; user: Record<string, unknown> } }
  ) {
    const orgId = ctx.req.orgId;
    const userId = ctx.req.user.sub as string;
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    
    return this.socialService.listPosts(orgId, userId, limit, args.cursor);
  }

  @Query('userPoints')
  async userPoints(
    _: unknown,
    args: { userId?: string },
    @Context() ctx: { req: Request & { orgId: string; user: Record<string, unknown> } }
  ) {
    const orgId = ctx.req.orgId;
    const userId = args.userId || (ctx.req.user.sub as string);
    
    return this.socialService.getUserPoints(orgId, userId);
  }

  @Mutation('createPost')
  async createPost(
    _: unknown,
    args: { input: CreatePostInput },
    @Context() ctx: { req: Request & { orgId: string; user: Record<string, unknown> } }
  ) {
    const orgId = ctx.req.orgId;
    const authorId = ctx.req.user.sub as string;
    
    return this.socialService.createPost(orgId, authorId, args.input);
  }

  @Mutation('likePost')
  async likePost(
    _: unknown,
    args: { postId: string },
    @Context() ctx: { req: Request & { orgId: string; user: Record<string, unknown> } }
  ) {
    const orgId = ctx.req.orgId;
    const userId = ctx.req.user.sub as string;
    
    return this.socialService.likePost(orgId, args.postId, userId);
  }

  @Mutation('unlikePost')
  async unlikePost(
    _: unknown,
    args: { postId: string },
    @Context() ctx: { req: Request & { orgId: string; user: Record<string, unknown> } }
  ) {
    const orgId = ctx.req.orgId;
    const userId = ctx.req.user.sub as string;
    
    return this.socialService.unlikePost(orgId, args.postId, userId);
  }

  @Mutation('sendPoints')
  async sendPoints(
    _: unknown,
    args: { toUserId: string; amount: number; reason?: string },
    @Context() ctx: { req: Request & { orgId: string; user: Record<string, unknown> } }
  ) {
    const orgId = ctx.req.orgId;
    const fromUserId = ctx.req.user.sub as string;
    
    return this.socialService.sendPoints(orgId, fromUserId, args.toUserId, args.amount, args.reason);
  }
}