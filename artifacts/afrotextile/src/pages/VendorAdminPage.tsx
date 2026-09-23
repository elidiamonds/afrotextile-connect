import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useDeferredValue, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  ImageOff,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  getGetProductImageCleanupStatusQueryKey,
  getListVendorsQueryKey,
  getListVendorReviewerAccessHistoryQueryKey,
  getListVendorReviewersQueryKey,
  useListVendorReviewerAccessHistory,
  useListVendorReviewers,
  useListVendors,
  useGetProductImageCleanupStatus,
  useRetryProductImageCleanup,
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
const reviewerHistoryPageParam = "historyPage";
const reviewerPageMax = 10_000;
const reviewerSearchMaxLength = 100;
const reviewerRefreshInterval = 5_000;

function formatRetryAge(seconds: number | null) {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function parseReviewerPage(value: string | null) {
  if (!value) return 1;

  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= reviewerPageMax
    ? page
    : 1;
}

export default function VendorAdminPage() {
  const { isLoaded, user } = useUser();
  const configuredAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL ?? "")
    .trim()
    .toLowerCase();
  const isAdmin =
    isLoaded &&
    (user?.publicMetadata?.role === "admin" ||
      Boolean(
        configuredAdminEmail &&
          user?.emailAddresses.some(
            ({ emailAddress }) =>
              emailAddress.trim().toLowerCase() === configuredAdminEmail,
          ),
      ));
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewerSearchParamValue = searchParams.get(reviewerSearchParam) ?? "";
  const reviewerSearch = reviewerSearchParamValue.slice(
    0,
    reviewerSearchMaxLength,
  );
  const reviewerPage = parseReviewerPage(searchParams.get(reviewerPageParam));
  const reviewerHistoryPage = parseReviewerPage(
    searchParams.get(reviewerHistoryPageParam),
  );
  const deferredReviewerSearch = useDeferredValue(reviewerSearch);
  const reviewerSearchQuery = deferredReviewerSearch.trim() || undefined;
  const reviewerPageSize = 25;
  const reviewerHistoryPageSize = 25;
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
        refetchInterval: reviewerRefreshInterval,
    },
  });
  const reviewerHistoryQuery = useListVendorReviewerAccessHistory({
    page: reviewerHistoryPage,
    limit: reviewerHistoryPageSize,
  }, {
    query: {
      enabled: isAdmin,
      queryKey: getListVendorReviewerAccessHistoryQueryKey({
        page: reviewerHistoryPage,
        limit: reviewerHistoryPageSize,
      }),
      placeholderData: keepPreviousData,
    },
  });
  const [isRetryingHistory, setIsRetryingHistory] = useState(false);
  const cleanupQuery = useGetProductImageCleanupStatus({
    query: {
      enabled: isAdmin,
      refetchInterval: 60_000,
      queryKey: getGetProductImageCleanupStatusQueryKey(),
    },
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const cleanupRetry = useRetryProductImageCleanup({
    mutation: {
      onSuccess: (result) => {
        queryClient.invalidateQueries({
          queryKey: getGetProductImageCleanupStatusQueryKey(),
        });
        toast({
          title:
            result.status === "failed"
              ? "Cleanup retry failed"
              : result.status === "cleaned"
                ? "Product photo cleanup completed"
                : "Cleanup already resolved",
          description: result.message,
          variant: result.status === "failed" ? "destructive" : "default",
        });
      },
      onError: () => {
        queryClient.invalidateQueries({
          queryKey: getGetProductImageCleanupStatusQueryKey(),
        });
        toast({
          title: "Could not retry photo cleanup",
          description: "The cleanup entry may have already been processed.",
          variant: "destructive",
        });
      },
    },
  });
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
  const reviewerTotalPages = reviewerPageData
    ? Math.max(1, Math.ceil(reviewerPageData.totalCount / reviewerPageData.limit))
    : 1;
  const currentReviewerPageData =
    reviewerPageData &&
      !reviewersQuery.isPlaceholderData &&
      reviewerPageData.page === reviewerPage &&
      reviewerPage <= reviewerTotalPages
      ? reviewerPageData
      : undefined;
  const visibleReviewers = currentReviewerPageData?.items ?? [];
  const reviewerHistoryPageData =
    reviewerHistoryQuery.data;
  const currentReviewerHistoryPageData =
    reviewerHistoryQuery.data &&
    !reviewerHistoryQuery.isPlaceholderData &&
    reviewerHistoryQuery.data.page === reviewerHistoryPage
      ? reviewerHistoryQuery.data
      : undefined;
  const historyUnavailable =
    reviewerHistoryQuery.isError || isRetryingHistory;
  const applicationsDenied = hasStatus(vendorsQuery.error, [401, 403]);

  useEffect(() => {
    const normalizedPage =
      reviewerPageData && !reviewersQuery.isPlaceholderData
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
    reviewersQuery.isPlaceholderData,
    reviewerTotalPages,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!currentReviewerHistoryPageData) return;

    const historyTotalPages = Math.max(
      1,
      Math.ceil(
        currentReviewerHistoryPageData.totalCount /
          currentReviewerHistoryPageData.limit,
      ),
    );
    const normalizedPage = Math.min(reviewerHistoryPage, historyTotalPages);
    if (
      !searchParams.has(reviewerHistoryPageParam) ||
      searchParams.get(reviewerHistoryPageParam) === String(normalizedPage)
    ) {
      return;
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (normalizedPage === 1) {
          next.delete(reviewerHistoryPageParam);
        } else {
          next.set(reviewerHistoryPageParam, String(normalizedPage));
        }
        return next;
      },
      { replace: true },
    );
  }, [
    currentReviewerHistoryPageData,
    reviewerHistoryPage,
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

  const updateReviewerHistoryPage = (page: number, replace = false) => {
    const historyTotalPages = currentReviewerHistoryPageData
      ? Math.max(
          1,
          Math.ceil(
            currentReviewerHistoryPageData.totalCount /
              currentReviewerHistoryPageData.limit,
          ),
        )
      : page;
    const boundedPage = Math.min(historyTotalPages, Math.max(1, page));
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (boundedPage === 1) {
          next.delete(reviewerHistoryPageParam);
        } else {
          next.set(reviewerHistoryPageParam, String(boundedPage));
        }
        return next;
      },
      { replace },
    );
  };

  const retryReviewerHistory = async () => {
    setIsRetryingHistory(true);
    try {
      await reviewerHistoryQuery.refetch();
    } finally {
      setIsRetryingHistory(false);
    }
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
        {!isLoaded ? (
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading permissions…
          </div>
        ) : (
          <>
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
            {isAdmin && (
          <section className="mb-8 rounded-sm border border-border bg-card p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-2">
                  <ImageOff className="h-5 w-5 text-primary" />
                  <h2 className="font-serif text-2xl font-bold">
                    Product photo cleanup
                  </h2>
                </div>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Failed photo deletions are retried in the background. Review
                  this queue when storage issues may leave orphaned files.
                </p>
              </div>
              {cleanupQuery.isFetching && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              )}
            </div>
            {cleanupQuery.isLoading && (
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Checking cleanup retries…
              </div>
            )}
            {cleanupQuery.isError && !cleanupQuery.isLoading && (
              <div className="mt-6 rounded-sm border border-destructive/40 bg-destructive/10 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <p className="font-medium">Cleanup status unavailable</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  The retry queue could not be checked. Try again shortly.
                </p>
              </div>
            )}
            {cleanupQuery.data && (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-sm border border-border bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Pending retries
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {cleanupQuery.data.pendingCount}
                    </p>
                  </div>
                  <div className="rounded-sm border border-border bg-background/40 p-4">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-primary" />
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Oldest retry age
                      </p>
                    </div>
                    <p className="mt-2 text-3xl font-semibold">
                      {formatRetryAge(cleanupQuery.data.oldestRetryAgeSeconds)}
                    </p>
                    {cleanupQuery.data.oldestRetryAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Started{" "}
                        {new Date(
                          cleanupQuery.data.oldestRetryAt,
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                {cleanupQuery.data.pendingCount === 0 ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No product photo cleanup retries are waiting.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Retry details
                    </p>
                    {cleanupQuery.data.failures.map((failure) => (
                      <div
                        key={failure.id}
                        className="rounded-sm border border-border bg-background/40 p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                          <div>
                            <p className="font-medium">
                              {failure.attempts === 1
                                ? "First cleanup attempt failed"
                                : `${failure.attempts} cleanup attempts failed`}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Last attempt{" "}
                              {failure.lastAttemptAt
                                ? new Date(
                                    failure.lastAttemptAt,
                                  ).toLocaleString()
                                : "not recorded"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="w-fit">
                              Next retry{" "}
                              {new Date(
                                failure.nextAttemptAt,
                              ).toLocaleString()}
                            </Badge>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                cleanupRetry.mutate({ cleanupId: failure.id })
                              }
                              disabled={
                                cleanupRetry.isPending &&
                                cleanupRetry.variables?.cleanupId === failure.id
                              }
                              aria-label={`Retry cleanup from ${new Date(
                                failure.createdAt,
                              ).toLocaleString()}`}
                            >
                              <RefreshCw
                                aria-hidden="true"
                                className={
                                  cleanupRetry.isPending &&
                                  cleanupRetry.variables?.cleanupId === failure.id
                                    ? "animate-spin"
                                    : ""
                                }
                              />
                              Retry now
                            </Button>
                          </div>
                        </div>
                        {failure.lastError && (
                          <p className="mt-3 break-words rounded-sm bg-muted/50 p-3 font-mono text-xs text-muted-foreground">
                            {failure.lastError}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
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
                  {isAdmin && (
                    <Button variant="outline" asChild>
                      <Link to={`/vendor/dashboard/${vendor.id}`}>
                        Edit storefront
                      </Link>
                    </Button>
                  )}
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

            <div className="mb-4 min-h-6">
              {reviewersQuery.isFetching && (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-busy="true"
                >
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin text-primary"
                  />
                  {reviewersQuery.isLoading
                    ? "Loading users…"
                    : "Checking for changes…"}
                </div>
              )}
            </div>
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
                  className="w-full min-w-0 pl-9 pr-10"
                />
                {reviewerSearch && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Clear reviewer search"
                    title="Clear reviewer search"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                    onClick={() => updateReviewerSearch("")}
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Search results update as you type.
              </p>
            </div>
            {reviewersQuery.isError && (
              <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-6">
                <h3 className="font-serif text-lg font-bold">
                  Reviewer access could not be loaded
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Something went wrong while loading users. Please try again.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => reviewersQuery.refetch()}
                  disabled={reviewersQuery.isFetching}
                >
                  <RefreshCw
                    aria-hidden="true"
                    className={reviewersQuery.isFetching ? "animate-spin" : ""}
                  />
                  Retry reviewer results
                </Button>
              </div>
            )}
            {!reviewersQuery.isLoading &&
              !reviewersQuery.isError &&
              visibleReviewers.length === 0 &&
              currentReviewerPageData && (
                <div className="rounded-sm border border-dashed border-border py-10 text-center text-muted-foreground">
                  {reviewerSearchQuery
                    ? `No users match “${reviewerSearchQuery}”.`
                    : "No signed-in users are available yet."}
                </div>
              )}
            {visibleReviewers.length > 0 && (
              <div className="grid gap-3">
                {visibleReviewers.map((reviewer) => {
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
                    className="min-w-0 flex flex-col justify-between gap-4 rounded-sm border border-border bg-card p-4 sm:flex-row sm:items-center"
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
            {currentReviewerPageData &&
              currentReviewerPageData.totalCount > 0 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing{" "}
                  {(currentReviewerPageData.page - 1) *
                    currentReviewerPageData.limit +
                    1}–
                  {Math.min(
                    currentReviewerPageData.page * currentReviewerPageData.limit,
                    currentReviewerPageData.totalCount,
                  )}{" "}
                  of {currentReviewerPageData.totalCount} users
                </span>
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <span className="shrink-0">
                    Page {currentReviewerPageData.page} of {reviewerTotalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
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
                    className="shrink-0"
                    disabled={
                      !currentReviewerPageData.hasNextPage ||
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
              {reviewerHistoryQuery.isFetching &&
                !reviewerHistoryQuery.isLoading && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Loading older access history…
                  </div>
                )}
              {historyUnavailable && (
                <div
                  className="rounded-sm border border-destructive/40 bg-destructive/10 p-6"
                  aria-busy={isRetryingHistory}
                >
                  <h3 className="font-serif text-lg font-bold">
                    Access history could not be loaded
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isRetryingHistory
                      ? "Retrying access history…"
                      : "Current reviewer access is still available. Please try again to inspect the audit history."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={retryReviewerHistory}
                    disabled={
                      isRetryingHistory || reviewerHistoryQuery.isFetching
                    }
                  >
                    <RefreshCw
                      aria-hidden="true"
                      className={
                        isRetryingHistory || reviewerHistoryQuery.isFetching
                          ? "animate-spin"
                          : ""
                      }
                    />
                    {isRetryingHistory
                      ? "Retrying access history…"
                      : "Retry access history"}
                  </Button>
                </div>
              )}
              {!reviewerHistoryQuery.isLoading &&
                !historyUnavailable &&
                reviewerHistoryPageData?.items.length === 0 && (
                  <div className="rounded-sm border border-dashed border-border py-10 text-center text-muted-foreground">
                    No reviewer access changes have been recorded.
                  </div>
                )}
              {!reviewerHistoryQuery.isLoading &&
                !historyUnavailable &&
                reviewerHistoryPageData &&
                reviewerHistoryPageData.items.length > 0 && (
                  <div className="overflow-hidden rounded-sm border border-border">
                    <div className="hidden grid-cols-[1fr_1fr_auto_auto] gap-4 bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:grid">
                      <span>Affected user</span>
                      <span>Changed by</span>
                      <span>Change</span>
                      <span>When</span>
                    </div>
                    <div className="divide-y divide-border">
                      {reviewerHistoryPageData.items.map((entry) => (
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
               {!historyUnavailable &&
                 reviewerHistoryPageData &&
                 reviewerHistoryPageData.totalCount > 0 && (
                   <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                     <span>
                       Showing{" "}
                       {(reviewerHistoryPageData.page - 1) *
                         reviewerHistoryPageData.limit +
                         1}
                       –
                       {Math.min(
                         reviewerHistoryPageData.page *
                           reviewerHistoryPageData.limit,
                         reviewerHistoryPageData.totalCount,
                       )}{" "}
                       of {reviewerHistoryPageData.totalCount} changes
                     </span>
                     <div className="flex min-w-0 flex-wrap items-center gap-3">
                       <span className="shrink-0">
                         Page{" "}
                         {reviewerHistoryPageData.page} of{" "}
                         {Math.max(
                           1,
                           Math.ceil(
                             reviewerHistoryPageData.totalCount /
                               reviewerHistoryPageData.limit,
                           ),
                         )}
                       </span>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         className="shrink-0"
                         disabled={
                           reviewerHistoryPage <= 1 ||
                           reviewerHistoryQuery.isFetching
                         }
                         onClick={() =>
                           updateReviewerHistoryPage(reviewerHistoryPage - 1)
                         }
                       >
                         <ChevronLeft className="h-4 w-4" />
                         Newer
                       </Button>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         className="shrink-0"
                         disabled={
                           !reviewerHistoryPageData.hasNextPage ||
                           reviewerHistoryQuery.isFetching
                         }
                         onClick={() =>
                           updateReviewerHistoryPage(reviewerHistoryPage + 1)
                         }
                       >
                         Older
                         <ChevronRight className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 )}
            </div>
          </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
