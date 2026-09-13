import { Router, type IRouter, type Request } from "express";
import { and, desc, eq } from "drizzle-orm";
import { clerkClient, getAuth } from "@clerk/express";
import {
  db,
  productsTable,
  vendorReviewerAccessHistoryTable,
  vendorsTable,
} from "@workspace/db";
import {
  CreateVendorBody,
  CreateVendorResponse,
  GetStorefrontParams,
  GetStorefrontResponse,
  GetVendorParams,
  GetVendorResponse,
  ListVendorsQueryParams,
  ListVendorsResponse,
  UpdateVendorBody,
  UpdateVendorParams,
  UpdateVendorResponse,
  UpdateVendorStatusBody,
  UpdateVendorStatusParams,
  UpdateVendorStatusResponse,
  UpdateVendorReviewerBody,
  UpdateVendorReviewerParams,
  UpdateVendorReviewerResponse,
  ListVendorReviewersQueryParams,
  ListVendorReviewersResponse,
  ListVendorReviewerAccessHistoryResponse,
} from "@workspace/api-zod";
import { toApiProduct } from "./products";

const router: IRouter = Router();

function authenticatedUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

async function isAdmin(userId: string): Promise<boolean> {
  const user = await clerkClient.users.getUser(userId);
  return user.publicMetadata.role === "admin";
}

async function isVendorReviewer(userId: string): Promise<boolean> {
  const user = await clerkClient.users.getUser(userId);
  return isVendorReviewerMetadata(user.publicMetadata);
}

function isVendorReviewerMetadata(metadata: Record<string, unknown>): boolean {
  return (
    metadata.role === "admin" ||
    metadata.role === "vendor_reviewer" ||
    metadata.role === "vendor-reviewer" ||
    metadata.vendorReviewer === true
  );
}

function toVendorReviewer(user: {
  id: string;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId: string | null;
  firstName: string | null;
  lastName: string | null;
  publicMetadata: Record<string, unknown>;
}) {
  const primaryEmail =
    user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    )?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;

  return {
    userId: user.id,
    email: primaryEmail,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.publicMetadata.role === "admin",
    vendorReviewer: user.publicMetadata.vendorReviewer === true,
    updatedAt:
      typeof user.publicMetadata.vendorReviewerUpdatedAt === "string"
        ? user.publicMetadata.vendorReviewerUpdatedAt
        : null,
    updatedByUserId:
      typeof user.publicMetadata.vendorReviewerUpdatedBy === "string"
        ? user.publicMetadata.vendorReviewerUpdatedBy
        : null,
  };
}

type ReviewerAccessUserDetails = {
  displayName: string | null;
  email: string | null;
};

function toReviewerAccessUserDetails(user: {
  emailAddresses: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId: string | null;
  firstName: string | null;
  lastName: string | null;
}): ReviewerAccessUserDetails {
  const displayName = [user.firstName, user.lastName]
    .filter((name): name is string => Boolean(name?.trim()))
    .join(" ")
    .trim();

  return {
    displayName: displayName || null,
    email:
      user.emailAddresses.find(
        (email) => email.id === user.primaryEmailAddressId,
      )?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null,
  };
}

async function getReviewerAccessUserDetails(
  userId: string,
): Promise<ReviewerAccessUserDetails> {
  try {
    return toReviewerAccessUserDetails(await clerkClient.users.getUser(userId));
  } catch {
    return { displayName: null, email: null };
  }
}

router.get("/vendors", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (!(await isVendorReviewer(userId))) {
    res.status(403).json({ error: "Vendor reviewer access required" });
    return;
  }

  const query = ListVendorsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const rows = query.data.status
    ? await db
        .select()
        .from(vendorsTable)
        .where(eq(vendorsTable.status, query.data.status))
        .orderBy(desc(vendorsTable.createdAt))
    : await db
        .select()
        .from(vendorsTable)
        .orderBy(desc(vendorsTable.createdAt));
  res.json(ListVendorsResponse.parse(rows));
});

router.get("/vendor-reviewers", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const query = ListVendorReviewersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { page, limit, search } = query.data;
  const users = await clerkClient.users.getUserList({
    limit,
    offset: (page - 1) * limit,
    ...(search ? { query: search } : {}),
    orderBy: "-created_at",
  });
  res.json(
    ListVendorReviewersResponse.parse(
      {
        items: users.data.map((user) => toVendorReviewer(user)),
        page,
        limit,
        totalCount: users.totalCount,
        hasNextPage: page * limit < users.totalCount,
      },
    ),
  );
});

router.get(
  "/vendor-reviewer-access-history",
  async (req, res): Promise<void> => {
    const userId = authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Sign in required" });
      return;
    }
    if (!(await isAdmin(userId))) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const history = await db
      .select()
      .from(vendorReviewerAccessHistoryTable)
      .orderBy(desc(vendorReviewerAccessHistoryTable.changedAt));
    const userIds = [
      ...new Set(
        history.flatMap((entry) => [entry.targetUserId, entry.actorUserId]),
      ),
    ];
    const userDetails = new Map(
      await Promise.all(
        userIds.map(
          async (id) => [id, await getReviewerAccessUserDetails(id)] as const,
        ),
      ),
    );

    res.json(
      ListVendorReviewerAccessHistoryResponse.parse(
        history.map((entry) => ({
          ...entry,
          targetUser: userDetails.get(entry.targetUserId) ?? {
            displayName: null,
            email: null,
          },
          actorUser: userDetails.get(entry.actorUserId) ?? {
            displayName: null,
            email: null,
          },
        })),
      ),
    );
  },
);

router.patch("/vendor-reviewers/:userId", async (req, res): Promise<void> => {
  const actorUserId = authenticatedUserId(req);
  if (!actorUserId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (!(await isAdmin(actorUserId))) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = UpdateVendorReviewerParams.safeParse(req.params);
  const body = UpdateVendorReviewerBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "A valid reviewer access value is required." });
    return;
  }

  let user;
  try {
    user = await clerkClient.users.getUser(params.data.userId);
  } catch {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updatedAt = new Date().toISOString();
  const updatedUser = await clerkClient.users.updateUserMetadata(
    params.data.userId,
    {
      publicMetadata: {
        ...user.publicMetadata,
        vendorReviewer: body.data.enabled,
        vendorReviewerUpdatedAt: updatedAt,
        vendorReviewerUpdatedBy: actorUserId,
      },
    },
  );

  await db.insert(vendorReviewerAccessHistoryTable).values({
    targetUserId: params.data.userId,
    actorUserId,
    action: body.data.enabled ? "grant" : "revoke",
  });

  res.json(UpdateVendorReviewerResponse.parse(toVendorReviewer(updatedUser)));
});

router.post("/vendors", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const body = CreateVendorBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const [vendor] = await db
      .insert(vendorsTable)
      .values({ ...body.data, ownerUserId: userId })
      .returning();
    res.status(201).json(CreateVendorResponse.parse(vendor));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({ error: "You already have a vendor application." });
      return;
    }
    throw error;
  }
});

router.get("/vendors/me", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.ownerUserId, userId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor application not found" });
    return;
  }
  res.json(GetVendorResponse.parse(vendor));
});

router.get("/vendors/:id", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const params = GetVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, params.data.id));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  if (vendor.ownerUserId !== userId && !(await isVendorReviewer(userId))) {
    res.status(403).json({ error: "You cannot access this vendor." });
    return;
  }
  res.json(GetVendorResponse.parse(vendor));
});

router.patch("/vendors/:id", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const params = UpdateVendorParams.safeParse(req.params);
  const body = UpdateVendorBody.safeParse(req.body);
  if (!params.success || !body.success || Object.keys(body.data).length === 0) {
    res
      .status(400)
      .json({ error: "Provide at least one valid storefront field." });
    return;
  }
  const admin = await isAdmin(userId);
  const [vendor] = await db
    .update(vendorsTable)
    .set(body.data)
    .where(
      admin
        ? eq(vendorsTable.id, params.data.id)
        : and(
            eq(vendorsTable.id, params.data.id),
            eq(vendorsTable.ownerUserId, userId),
          ),
    )
    .returning();
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(UpdateVendorResponse.parse(vendor));
});

router.patch("/vendors/:id/status", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (!(await isVendorReviewer(userId))) {
    res.status(403).json({ error: "Vendor reviewer access required" });
    return;
  }
  const params = UpdateVendorStatusParams.safeParse(req.params);
  const body = UpdateVendorStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res
      .status(400)
      .json({ error: "A valid status and review note are required." });
    return;
  }
  const [vendor] = await db
    .update(vendorsTable)
    .set(body.data)
    .where(eq(vendorsTable.id, params.data.id))
    .returning();
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(UpdateVendorStatusResponse.parse(vendor));
});

router.get("/storefronts/:id", async (req, res): Promise<void> => {
  const params = GetStorefrontParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vendor] = await db
    .select({
      id: vendorsTable.id,
      businessName: vendorsTable.businessName,
      location: vendorsTable.location,
      category: vendorsTable.category,
      plan: vendorsTable.plan,
      description: vendorsTable.description,
      logoUrl: vendorsTable.logoUrl,
      status: vendorsTable.status,
    })
    .from(vendorsTable)
    .where(
      and(
        eq(vendorsTable.id, params.data.id),
        eq(vendorsTable.status, "approved"),
      ),
    );
  if (!vendor) {
    res.status(404).json({ error: "Approved storefront not found" });
    return;
  }
  const products = await db
    .select({ product: productsTable, vendorName: vendorsTable.businessName })
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(
      and(
        eq(productsTable.vendorId, vendor.id),
        eq(productsTable.status, "published"),
      ),
    )
    .orderBy(desc(productsTable.createdAt));

  res.json(
    GetStorefrontResponse.parse({
      ...vendor,
      products: products.map(({ product, vendorName }) =>
        toApiProduct(product, vendorName),
      ),
    }),
  );
});

export default router;
