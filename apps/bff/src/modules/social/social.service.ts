import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, gt } from 'drizzle-orm';
import { posts, postLikes, userPoints, pointTransactions, recognitions, users } from '../../../../../services/identity/src/db/schema';
import { OrgSqlContext } from '../../db/with-org';

export interface CreatePostInput {
  content: string;
  type?: string;
}

export interface CreateRecognitionInput {
  toUserId: string;
  values: string[];
  pointsAwarded: number;
  message?: string;
  isPublic?: boolean;
}

@Injectable()
export class SocialService {
  constructor(private readonly orgSqlContext: OrgSqlContext) {}

  private get db() {
    return this.orgSqlContext.db;
  }

  async createPost(orgId: string, authorId: string, input: CreatePostInput) {
    const [newPost] = await this.db
      .insert(posts)
      .values({
        organizationId: orgId,
        authorId: authorId,
        content: input.content,
        type: input.type || 'text',
      })
      .returning();

    return this.getPostById(orgId, newPost.id, authorId);
  }

  async getPostById(orgId: string, postId: string, currentUserId?: string) {
    const postData = await this.db
      .select({
        id: posts.id,
        organizationId: posts.organizationId,
        authorId: posts.authorId,
        content: posts.content,
        type: posts.type,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorEmail: users.email,
        authorDisplayName: users.displayName,
        isLiked: currentUserId ? sql<boolean>`EXISTS (
          SELECT 1 FROM ${postLikes} 
          WHERE ${postLikes.postId} = ${posts.id} 
          AND ${postLikes.userId} = ${currentUserId}
        )` : sql<boolean>`false`,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(
        eq(posts.id, postId),
        eq(posts.organizationId, orgId),
        eq(posts.isActive, true)
      ))
      .limit(1);

    if (postData.length === 0) {
      throw new NotFoundException('Post not found');
    }

    const post = postData[0];
    return {
      id: post.id,
      organizationId: post.organizationId,
      author: {
        id: post.authorId,
        email: post.authorEmail,
        firstName: post.authorFirstName,
        lastName: post.authorLastName,
        displayName: post.authorDisplayName,
      },
      content: post.content,
      type: post.type,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isLiked: post.isLiked,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  async listPosts(orgId: string, currentUserId: string, limit = 20, cursor?: string) {
    let query = this.db
      .select({
        id: posts.id,
        organizationId: posts.organizationId,
        authorId: posts.authorId,
        content: posts.content,
        type: posts.type,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorEmail: users.email,
        authorDisplayName: users.displayName,
        isLiked: sql<boolean>`EXISTS (
          SELECT 1 FROM ${postLikes} 
          WHERE ${postLikes.postId} = ${posts.id} 
          AND ${postLikes.userId} = ${currentUserId}
        )`,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(
        eq(posts.organizationId, orgId),
        eq(posts.isActive, true)
      ))
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    if (cursor) {
      query = query.where(and(
        eq(posts.organizationId, orgId),
        eq(posts.isActive, true),
        gt(posts.createdAt, new Date(cursor))
      ));
    }

    const postData = await query;

    return postData.map(post => ({
      id: post.id,
      organizationId: post.organizationId,
      author: {
        id: post.authorId,
        email: post.authorEmail,
        firstName: post.authorFirstName,
        lastName: post.authorLastName,
        displayName: post.authorDisplayName,
      },
      content: post.content,
      type: post.type,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isLiked: post.isLiked,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    }));
  }

  async likePost(orgId: string, postId: string, userId: string) {
    // Check if post exists and belongs to organization
    const post = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(and(
        eq(posts.id, postId),
        eq(posts.organizationId, orgId),
        eq(posts.isActive, true)
      ))
      .limit(1);

    if (post.length === 0) {
      throw new NotFoundException('Post not found');
    }

    // Insert like (will throw error if already exists due to unique constraint)
    try {
      await this.db.insert(postLikes).values({
        postId: postId,
        userId: userId,
      });

      // Update like count
      await this.db
        .update(posts)
        .set({ 
          likeCount: sql`${posts.likeCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(posts.id, postId));

      return this.getPostById(orgId, postId, userId);
    } catch (error) {
      // If duplicate key error, user already liked this post
      throw new BadRequestException('Post already liked');
    }
  }

  async unlikePost(orgId: string, postId: string, userId: string) {
    // Check if post exists and belongs to organization
    const post = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(and(
        eq(posts.id, postId),
        eq(posts.organizationId, orgId),
        eq(posts.isActive, true)
      ))
      .limit(1);

    if (post.length === 0) {
      throw new NotFoundException('Post not found');
    }

    // Remove like
    const deletedLikes = await this.db
      .delete(postLikes)
      .where(and(
        eq(postLikes.postId, postId),
        eq(postLikes.userId, userId)
      ))
      .returning({ id: postLikes.id });

    if (deletedLikes.length === 0) {
      throw new BadRequestException('Post not liked');
    }

    // Update like count
    await this.db
      .update(posts)
      .set({ 
        likeCount: sql`${posts.likeCount} - 1`,
        updatedAt: new Date()
      })
      .where(eq(posts.id, postId));

    return this.getPostById(orgId, postId, userId);
  }

  async getUserPoints(orgId: string, userId: string) {
    const pointsData = await this.db
      .select()
      .from(userPoints)
      .where(and(
        eq(userPoints.userId, userId),
        eq(userPoints.organizationId, orgId)
      ))
      .limit(1);

    if (pointsData.length === 0) {
      // Create initial points record
      const [newPoints] = await this.db
        .insert(userPoints)
        .values({
          userId: userId,
          organizationId: orgId,
          availablePoints: 1250,
          pendingPoints: 1000,
          totalEarned: 2500,
          totalSpent: 250,
        })
        .returning();

      return {
        userId: newPoints.userId,
        availablePoints: newPoints.availablePoints,
        pendingPoints: newPoints.pendingPoints,
        totalEarned: newPoints.totalEarned,
        totalSpent: newPoints.totalSpent,
      };
    }

    const points = pointsData[0];
    return {
      userId: points.userId,
      availablePoints: points.availablePoints,
      pendingPoints: points.pendingPoints,
      totalEarned: points.totalEarned,
      totalSpent: points.totalSpent,
    };
  }

  async sendPoints(orgId: string, fromUserId: string, toUserId: string, amount: number, reason?: string) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Check sender has enough points
    const senderPoints = await this.getUserPoints(orgId, fromUserId);
    if (senderPoints.availablePoints < amount) {
      throw new BadRequestException('Insufficient points');
    }

    // Check receiver exists
    const receiver = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.id, toUserId),
        eq(users.organizationId, orgId)
      ))
      .limit(1);

    if (receiver.length === 0) {
      throw new NotFoundException('Recipient not found');
    }

    // Execute transaction
    await this.db.transaction(async (tx) => {
      // Deduct from sender
      await tx
        .update(userPoints)
        .set({
          availablePoints: sql`${userPoints.availablePoints} - ${amount}`,
          totalSpent: sql`${userPoints.totalSpent} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(userPoints.userId, fromUserId),
          eq(userPoints.organizationId, orgId)
        ));

      // Add to receiver
      await tx
        .insert(userPoints)
        .values({
          userId: toUserId,
          organizationId: orgId,
          availablePoints: amount,
          totalEarned: amount,
        })
        .onConflictDoUpdate({
          target: [userPoints.userId, userPoints.organizationId],
          set: {
            availablePoints: sql`${userPoints.availablePoints} + ${amount}`,
            totalEarned: sql`${userPoints.totalEarned} + ${amount}`,
            updatedAt: new Date(),
          },
        });

      // Record transaction
      await tx.insert(pointTransactions).values({
        fromUserId: fromUserId,
        toUserId: toUserId,
        organizationId: orgId,
        amount: amount,
        type: 'sent',
        reason: reason,
        description: `Points sent from user to user`,
      });
    });

    return true;
  }
}