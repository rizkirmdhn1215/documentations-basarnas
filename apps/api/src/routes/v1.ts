import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  buildOriginalKey,
  buildPreviewKey,
  buildS3PublicUrl,
  createDownloadUrl,
  createUploadUrl,
} from "../lib/s3";

const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(120),
});

const createEntrySchema = z.object({
  contentType: z.string().min(1).max(60),
  contentLink: z.string().url().optional().nullable(),
  title: z.string().min(1).max(180),
  description: z.string().max(5000).optional().nullable(),
  entryDate: z.string().date().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).min(1).max(20).optional(),
  assetIds: z.array(z.string().uuid()).optional(),
});

const uploadUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
});

function parseDateOrThrow(input?: string) {
  if (!input) return new Date();
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid entryDate");
  }
  return date;
}

export async function v1Routes(app: FastifyInstance) {
  app.get("/months", async () => {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      select: {
        monthKey: true,
        _count: { select: { entries: true } },
      },
    });

    const map = new Map<string, { monthKey: string; categoryCount: number; entryCount: number }>();

    for (const category of categories) {
      const prev = map.get(category.monthKey) || {
        monthKey: category.monthKey,
        categoryCount: 0,
        entryCount: 0,
      };
      prev.categoryCount += 1;
      prev.entryCount += category._count.entries;
      map.set(category.monthKey, prev);
    }

    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  });

  app.get("/months/:monthKey/categories", async (request, reply) => {
    const parsed = monthKeySchema.safeParse((request.params as { monthKey?: string }).monthKey);
    if (!parsed.success) {
      reply.code(400);
      return { error: "Invalid monthKey format. Use YYYY-MM" };
    }

    const categories = await prisma.category.findMany({
      where: {
        monthKey: parsed.data,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        monthKey: true,
        createdAt: true,
        _count: { select: { entries: true } },
      },
    });

    return categories.map((category) => ({
      ...category,
      createdAt: category.createdAt.toISOString(),
      entryCount: category._count.entries,
    }));
  });

  app.post("/months/:monthKey/categories", async (request, reply) => {
    const monthResult = monthKeySchema.safeParse((request.params as { monthKey?: string }).monthKey);
    const bodyResult = createCategorySchema.safeParse(request.body);

    if (!monthResult.success || !bodyResult.success) {
      reply.code(400);
      return { error: "Invalid request body or monthKey" };
    }

    const category = await prisma.category.create({
      data: {
        monthKey: monthResult.data,
        name: bodyResult.data.name,
      },
    });

    return {
      id: category.id,
      name: category.name,
      monthKey: category.monthKey,
      createdAt: category.createdAt.toISOString(),
    };
  });

  app.patch("/categories/:categoryId", async (request, reply) => {
    const params = z.object({ categoryId: z.string().uuid() }).safeParse(request.params);
    const body = updateCategorySchema.safeParse(request.body);
    if (!params.success || !body.success) {
      reply.code(400);
      return { error: "Invalid request" };
    }

    const exists = await prisma.category.findUnique({
      where: { id: params.data.categoryId },
      select: { id: true, monthKey: true },
    });
    if (!exists) {
      reply.code(404);
      return { error: "Category not found" };
    }

    const updated = await prisma.category.update({
      where: { id: params.data.categoryId },
      data: { name: body.data.name },
    });

    return {
      id: updated.id,
      name: updated.name,
      monthKey: updated.monthKey,
    };
  });

  app.delete("/categories/:categoryId", async (request, reply) => {
    const params = z.object({ categoryId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      reply.code(400);
      return { error: "Invalid categoryId" };
    }

    const exists = await prisma.category.findUnique({
      where: { id: params.data.categoryId },
      select: { id: true },
    });
    if (!exists) {
      reply.code(404);
      return { error: "Category not found" };
    }

    await prisma.category.update({
      where: { id: params.data.categoryId },
      data: { deletedAt: new Date() },
    });

    return { ok: true };
  });

  app.get("/categories/:categoryId/entries", async (request, reply) => {
    const params = z.object({ categoryId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      reply.code(400);
      return { error: "Invalid categoryId" };
    }

    const entries = await prisma.entry.findMany({
      where: { categoryId: params.data.categoryId },
      orderBy: { createdAt: "desc" },
      include: {
        assets: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return entries.map((entry) => ({
      id: entry.id,
      contentType: entry.contentType,
      contentLink: entry.contentLink,
      title: entry.title,
      description: entry.description,
      entryDate: entry.entryDate.toISOString(),
      tags: entry.tags,
      createdAt: entry.createdAt.toISOString(),
      assets: entry.assets.map((asset) => ({
        id: asset.id,
        filename: asset.filename,
        contentType: asset.contentType,
        sizeBytes: asset.sizeBytes,
        s3KeyOriginal: asset.s3KeyOriginal,
        s3KeyPreview: asset.s3KeyPreview,
        originalUrl: asset.originalUrl,
        previewUrl: asset.previewUrl,
        createdAt: asset.createdAt.toISOString(),
      })),
    }));
  });

  app.post("/categories/:categoryId/entries", async (request, reply) => {
    const params = z.object({ categoryId: z.string().uuid() }).safeParse(request.params);
    const body = createEntrySchema.safeParse(request.body);

    if (!params.success || !body.success) {
      reply.code(400);
      return { error: "Invalid request body" };
    }

    const category = await prisma.category.findFirst({
      where: { id: params.data.categoryId, deletedAt: null },
      select: { id: true, monthKey: true },
    });

    if (!category) {
      reply.code(404);
      return { error: "Category not found" };
    }

    let entryDate: Date;
    try {
      entryDate = parseDateOrThrow(body.data.entryDate);
    } catch {
      reply.code(400);
      return { error: "Invalid entryDate" };
    }

    const entry = await prisma.entry.create({
      data: {
        categoryId: category.id,
        monthKey: category.monthKey,
        contentType: body.data.contentType.trim(),
        contentLink: body.data.contentLink ?? null,
        title: body.data.title,
        description: body.data.description ?? null,
        entryDate,
        tags: body.data.tags ?? [],
      },
    });

    if ((body.data.assetIds || []).length > 0) {
      await prisma.asset.updateMany({
        where: {
          id: { in: body.data.assetIds },
          entryId: null,
        },
        data: { entryId: entry.id },
      });
    }

    return { id: entry.id };
  });

  app.post("/assets/upload-url", async (request, reply) => {
    const body = uploadUrlSchema.safeParse(request.body);
    if (!body.success) {
      reply.code(400);
      return { error: "Invalid upload request" };
    }

    const key = buildOriginalKey(body.data.filename);
    const previewKey = buildPreviewKey();
    const putUrl = await createUploadUrl({
      key,
      contentType: body.data.contentType,
      sizeBytes: body.data.sizeBytes,
    });
    const previewPutUrl = await createUploadUrl({
      key: previewKey,
      contentType: "image/jpeg",
      sizeBytes: Math.min(body.data.sizeBytes, 2 * 1024 * 1024),
    });
    const originalUrl = buildS3PublicUrl(key);
    const previewUrl = buildS3PublicUrl(previewKey);

    const asset = await prisma.asset.create({
      data: {
        s3KeyOriginal: key,
        s3KeyPreview: previewKey,
        originalUrl,
        previewUrl,
        filename: body.data.filename,
        contentType: body.data.contentType,
        sizeBytes: body.data.sizeBytes,
      },
    });

    return {
      id: asset.id,
      key,
      putUrl,
      publicUrl: originalUrl,
      previewKey,
      previewPutUrl,
      previewUrl,
    };
  });

  app.get("/assets/:id/download-url", async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      reply.code(400);
      return { error: "Invalid asset id" };
    }

    const asset = await prisma.asset.findUnique({
      where: { id: params.data.id },
      select: { s3KeyOriginal: true },
    });

    if (!asset) {
      reply.code(404);
      return { error: "Asset not found" };
    }

    const downloadUrl = await createDownloadUrl(asset.s3KeyOriginal);
    return { downloadUrl };
  });
}
