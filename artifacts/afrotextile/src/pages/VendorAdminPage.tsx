import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useDeferredValue, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  getListVendorsQueryKey,
  getListVendorReviewerAccessHistoryQueryKey,
  getListVendorReviewersQueryKey,
  useListVendorReviewerAccessHistory,
  useListVendorReviewers,
  useListVendors,
  useUpdateVendorReviewer,
  useUpdateVendorStatus,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VendorProductManager from "@/components/VendorProductManager";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

function hasStatus(error: unknown, statuses: number[]) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    statuses.includes((error as { status?: unknown }).status as number)
  );
}

const reviewerSearchParam = "search";
const reviewerPageParam = "page";
const reviewerPageMax = 10_000;
const reviewerSearchMaxLength = 100;

function parseReviewerPage(value: string | null) {
  if (!value) return 1;

  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= reviewerPageMax
    ? page
    : 1;
}

export default function VendorAdminPage() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewerSearchParamValue = searchParams.get(reviewerSearchParam) ?? "";
  const reviewerSearch = reviewerSearchParamValue.slice(
    0,
    reviewerSearchMaxLength,
  );
  const reviewerPage = parseReviewerPage(searchParams.get(reviewerPageParam));
  const deferredReviewerSearch = useDeferredValue(reviewerSearch);
  const reviewerSearchQuery = deferredReviewerSearch.trim() || undefined;
  const reviewerPageSize = 25;
  const vendorsQuery = useListVendors();
  const reviewersQuery = useListVendorReviewers({
    search: reviewerSearchQuery,
    page: reviewerPage,
    limit: reviewerPageSize,
  }, {
    query: {
      enabled: isAdmin,
      queryKey: getListVendorReviewersQueryKey({
        search: reviewerSearchQuery,
        page: reviewerPage,
        limit: reviewerPageSize,
      }),
      placeholderData: keepPreviousData,
    },
  });
  const reviewerHistoryQuery = useListVendorReviewerAccessHistory({
    query: {
      enabled: isAdmin,
      queryKey: getListVendorReviewerAccessHistoryQueryKey(),
    },
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const review = useUpdateVendorStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
        toast({ title: "Application updated" });
      },
      onError: () =>
        toast({
          title: "Could not update application",
          variant: "destructive",
        }),
    },
  });
  const reviewerAccess = useUpdateVendorReviewer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListVendorReviewersQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListVendorReviewerAccessHistoryQueryKey(),
        });
        toast({ title: "Reviewer access updated" });
      },
      onError: () =>
        toast({
          title: "Could not update reviewer access",
          variant: "destructive",
        }),
    },
  });

  const vendors = vendorsQuery.data ?? [];
  const reviewerPageData = reviewersQuery.data;
  const reviewers = reviewerPageData?.items ?? [];
  const reviewerTotalPages = reviewerPageData
    ? Math.max(1, Math.ceil(reviewerPageData.totalCount / reviewerPageData.limit))
    : 1;
  const applicationsDenied = hasStatus(vendorsQuery.error, [401, 403]);

  useEffect(() => {
    const normalizedPage = reviewerPageData
      ? Math.min(reviewerPage, reviewerTotalPages)
      : reviewerPage;
    const shouldNormalizeSearch =
      reviewerSearchParamValue.length > reviewerSearchMaxLength;
    const shouldNormalizePage =
      searchParams.has(reviewerPageParam) &&
      searchParams.get(reviewerPageParam) !== String(normalizedPage);

    if (!shouldNormalizeSearch && !shouldNormalizePage) return;

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (shouldNormalizeSearch) {
          if (reviewerSearch) {
            next.set(reviewerSearchParam, reviewerSearch);
          } else {
            next.delete(reviewerSearchParam);
          }
        }
        if (shouldNormalizePage) {
          if (normalizedPage === 1) {
            next.set(reviewerPageParam, "1");
          } else {
            next.set(reviewerPageParam, String(normalizedPage));
          }
        }
        return next;
      },
      { replace: true },
    );
  }, [
    reviewerPage,
    reviewerPageData,
    reviewerSearch,
    reviewerSearchParamValue,
    reviewerTotalPages,
    searchParams,
    setSearchParams,
  ]);

  const updateReviewerSearch = (value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        const boundedValue = value.slice(0, reviewerSearchMaxLength);
        if (boundedValue) {
          next.set(reviewerSearchParam, boundedValue);
        } else {
          next.delete(reviewerSearchParam);
        }
        next.delete(reviewerPageParam);
        return next;
      },
      { replace: true },
    );
  };

  const updateReviewerPage = (page: number, replace = false) => {
    const boundedPage = Math.min(reviewerTotalPages, Math.max(1, page));
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (boundedPage === 1) {
          next.delete(reviewerPageParam);
        } else {
          next.set(reviewerPageParam, String(boundedPage));
        }
        return next;
      },
      { replace },
    );
  };

  return (
    <div className="min-h-screen px-4 pb-16 pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">
            Admin
          </span>
          <h1 className="mt-2 font-serif text-4xl font-bold">
            Vendor applications
          </h1>
          <p className="mt-2 text-muted-foreground">
            Review submitted businesses before their storefronts go live.
          </p>
        </div>
        {vendorsQuery.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading vendor applications…
          </div>
        )}
        {applicationsDenied && (
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-6">
            <h2 className="font-serif text-xl font-bold">Access required</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You do not have permission to review vendor applications. Ask an
              administrator to grant vendor reviewer access.
            </p>
          </div>
        )}
        {vendorsQuery.isError && !applicationsDenied && (
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-6">
            <h2 className="font-serif text-xl font-bold">
              Applications could not be loaded
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Something went wrong while loading the applications. Please try
              again.
            </p>
          </div>
        )}
        {!vendorsQuery.isLoading &&
          !vendorsQuery.isError &&
          vendors.length === 0 && (
          <div className="rounded-sm border border-dashed border-border py-16 text-center text-muted-foreground">
            No vendor applications yet.
          </div>
          )}
        {!applicationsDenied && (
          <div className="grid gap-5">
          {vendors.map((vendor) => (
            <article
              key={vendor.id}
              className="rounded-sm border border-border bg-card p-6"
            >
              <div className="flex flex-col justify-between gap-5 lg:flex-row">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-serif text-2xl font-bold">
                      {vendor.businessName}
                    </h2>
                    <Badge
                      variant={
                        vendor.status === "rejected"
                          ? "destructive"
                          : vendor.status === "approved"
                            ? "default"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {vendor.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {vendor.category} · {vendor.location} · {vendor.plan}
                  </p>
                  <p className="max-w-3xl text-sm leading-relaxed">
                    {vendor.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Contact: {vendor.contactName} · {vendor.email} ·{" "}
                    {vendor.phone}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <Button
                    disabled={review.isPending || vendor.status === "approved"}
                    onClick={() =>
                      review.mutate({
                        id: vendor.id,
                        data: { status: "approved", reviewNote: null },
                      })
                    }
                  >
                    <Check className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={review.isPending || vendor.status === "rejected"}
                    onClick={() =>
                      review.mutate({
                        id: vendor.id,
                        data: {
                          status: "rejected",
                          reviewNote:
                            "The application needs more information before approval.",
                        },
                      })
                    }
                  >
                    <X className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
              {vendor.status === "approved" && (
                <div className="mt-6 border-t border-border pt-6">
                  <VendorProductManager
                    vendorId={vendor.id}
                    approved
                    reviewOnly
                  />
                </div>
              )}
            </article>
          ))}
          </div>
        )}

        {isAdmin && (
          <section className="mt-16 border-t border-border pt-10">
            <div className="mb-6 flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
              <div>
                <h2 className="font-serif text-2xl font-bold">
                  Reviewer access
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Grant or revoke vendor-review access without changing a
                  user’s administrator role. Every change records the acting
                  admin and its timestamp.
                </p>
              </div>
            </div>

            {reviewersQuery.isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading users…
              </div>
            )}
            <div className="mb-5 rounded-sm border border-border bg-card p-4">
              <label
                htmlFor="reviewer-search"
                className="text-sm font-medium"
              >
                Search users
              </label>
              <div className="relative mt-2">
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="reviewer-search"
                  value={reviewerSearch}
                  onChange={(event) => updateReviewerSearch(event.target.value)}
                  maxLength={reviewerSearchMaxLength}
                  placeholder="Search by name, email, or user ID"
                  className="pl-9"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Search results update as you type.
              </p>
            </div>
            {reviewersQuery.isFetching && !reviewersQuery.isLoading && (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Updating results…
              </div>
            )}
            {reviewersQuery.isError && (
              <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-6">
                <h3 className="font-serif text-lg font-bold">
                  Reviewer access could not be loaded
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Something went wrong while loading users. Please try again.
                </p>
              </div>
            )}
            {!reviewersQuery.isLoading &&
              !reviewersQuery.isError &&
              reviewers.length === 0 && (
                <div className="rounded-sm border border-dashed border-border py-10 text-center text-muted-foreground">
                  {reviewerSearchQuery
                    ? `No users match “${reviewerSearchQuery}”.`
                    : "No signed-in users are available yet."}
                </div>
              )}
            {reviewers.length > 0 && (
              <div className="grid gap-3">
                {reviewers.map((reviewer) => {
                const name =
                  [reviewer.firstName, reviewer.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                  reviewer.email ||
                  reviewer.userId;
                const changing =
                  reviewerAccess.isPending &&
                  reviewerAccess.variables?.userId === reviewer.userId;
                const hasReviewerAccess =
                  reviewer.isAdmin || reviewer.vendorReviewer;

                return (
                  <div
                    key={reviewer.userId}
                    className="flex flex-col justify-between gap-4 rounded-sm border border-border bg-card p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {reviewer.email ?? reviewer.userId}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {reviewer.updatedAt
                            ? `Last changed ${new Date(
                                reviewer.updatedAt,
                              ).toLocaleString()}`
                            : "No reviewer access change recorded"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge
                        variant={
                          reviewer.isAdmin || reviewer.vendorReviewer
                            ? "default"
                            : "outline"
                        }
                      >
                        {reviewer.isAdmin
                          ? "Administrator"
                          : reviewer.vendorReviewer
                            ? "Vendor reviewer"
                          : "No access"}
                      </Badge>
                      <Button
                        variant={
                          hasReviewerAccess ? "destructive" : "outline"
                        }
                        size="sm"
                        disabled={reviewerAccess.isPending || reviewer.isAdmin}
                        onClick={() =>
                          reviewerAccess.mutate({
                            userId: reviewer.userId,
                            data: { enabled: !reviewer.vendorReviewer },
                          })
                        }
                      >
                        {changing && !reviewer.isAdmin && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {reviewer.isAdmin
                          ? "Admin access"
                          : reviewer.vendorReviewer
                            ? "Revoke"
                            : "Grant"}
                      </Button>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
            {reviewerPageData && reviewerPageData.totalCount > 0 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing{" "}
                  {(reviewerPageData.page - 1) * reviewerPageData.limit + 1}–
                  {Math.min(
                    reviewerPageData.page * reviewerPageData.limit,
                    reviewerPageData.totalCount,
                  )}{" "}
                  of {reviewerPageData.totalCount} users
                </span>
                <div className="flex items-center gap-3">
                  <span>
                    Page {reviewerPageData.page} of {reviewerTotalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      reviewerPage <= 1 || reviewersQuery.isFetching
                    }
                    onClick={() => updateReviewerPage(reviewerPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      !reviewerPageData.hasNextPage ||
                      reviewersQuery.isFetching
                    }
                    onClick={() => updateReviewerPage(reviewerPage + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-10 border-t border-border pt-8">
              <div className="mb-5 flex items-start gap-3">
                <History className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-serif text-xl font-bold">
                    Access history
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Every grant and revoke is retained with the affected user,
                    acting administrator, and exact time.
                  </p>
                </div>
              </div>

              {reviewerHistoryQuery.isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading access history…
                </div>
              )}
              {reviewerHistoryQuery.isError && (
                <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-6">
                  <h3 className="font-serif text-lg font-bold">
                    Access history could not be loaded
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Current reviewer access is still available. Please try
                    again to inspect the audit history.
                  </p>
                </div>
              )}
              {!reviewerHistoryQuery.isLoading &&
                !reviewerHistoryQuery.isError &&
                reviewerHistoryQuery.data?.length === 0 && (
                  <div className="rounded-sm border border-dashed border-border py-10 text-center text-muted-foreground">
                    No reviewer access changes have been recorded.
                  </div>
                )}
              {!reviewerHistoryQuery.isLoading &&
                !reviewerHistoryQuery.isError &&
                reviewerHistoryQuery.data &&
                reviewerHistoryQuery.data.length > 0 && (
                  <div className="overflow-hidden rounded-sm border border-border">
                    <div className="hidden grid-cols-[1fr_1fr_auto_auto] gap-4 bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:grid">
                      <span>Affected user</span>
                      <span>Changed by</span>
                      <span>Change</span>
                      <span>When</span>
                    </div>
                    <div className="divide-y divide-border">
                      {reviewerHistoryQuery.data.map((entry) => (
                        <div
                          key={entry.id}
                          className="grid gap-2 px-4 py-4 text-sm sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center sm:gap-4"
                        >
                          <div>
                            <p className="font-medium">
                              {entry.targetUser.displayName ?? "Unknown user"}
                            </p>
                            {entry.targetUser.email && (
                              <p className="text-xs text-muted-foreground">
                                {entry.targetUser.email}
                              </p>
                            )}
                            <p className="break-all text-xs text-muted-foreground">
                              {entry.targetUserId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Affected user
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">
                              {entry.actorUser.displayName ??
                                "Unknown administrator"}
                            </p>
                            {entry.actorUser.email && (
                              <p className="text-xs text-muted-foreground">
                                {entry.actorUser.email}
                              </p>
                            )}
                            <p className="break-all text-xs text-muted-foreground">
                              {entry.actorUserId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Administrator
                            </p>
                          </div>
                          <Badge
                            variant={
                              entry.action === "grant"
                                ? "default"
                                : "destructive"
                            }
                            className="w-fit capitalize"
                          >
                            {entry.action}
                          </Badge>
                          <time
                            dateTime={new Date(entry.changedAt).toISOString()}
                            className="text-xs text-muted-foreground"
                          >
                            {new Date(entry.changedAt).toLocaleString()}
                          </time>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
