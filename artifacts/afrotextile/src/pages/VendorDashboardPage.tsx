import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  History,
  Loader2,
  RotateCcw,
  WifiOff,
} from "lucide-react";
import {
  getGetVendorQueryKey,
  getListVendorStorefrontHistoryQueryKey,
  useGetVendor,
  useListVendorStorefrontHistory,
  useUpdateVendor,
  type VendorStorefrontHistoryEntry,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VendorFormFields, {
  type VendorForm,
  type VendorFieldErrors,
} from "@/components/VendorFormFields";
import VendorProductManager from "@/components/VendorProductManager";
import VendorOrderManager from "@/components/VendorOrderManager";
import { useToast } from "@/hooks/use-toast";

const emptyForm: VendorForm = {
  businessName: "",
  contactName: "",
  email: "",
  phone: "",
  location: "",
  category: "",
  plan: "Starter",
  description: "",
  logoUrl: "",
};

const storefrontHistoryFieldLabels: Record<string, string> = {
  businessName: "Business name",
  contactName: "Contact name",
  phone: "Phone",
  location: "Location",
  category: "Category",
  plan: "Plan",
  description: "Brand story",
  logoUrl: "Logo",
};

function formatStorefrontHistoryValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getStorefrontFieldErrors(error: unknown): VendorFieldErrors | null {
  if (!error || typeof error !== "object") return null;

  const apiError = error as { status?: unknown; data?: unknown };
  if (
    apiError.status !== 422 ||
    !apiError.data ||
    typeof apiError.data !== "object"
  ) {
    return null;
  }

  const fieldErrors = (apiError.data as { fieldErrors?: unknown }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") return null;

  const validFields: Array<keyof VendorForm> = [
    "businessName",
    "contactName",
    "email",
    "phone",
    "location",
    "category",
    "plan",
    "description",
    "logoUrl",
  ];
  const parsedErrors: VendorFieldErrors = {};
  for (const field of validFields) {
    const message = (fieldErrors as Record<string, unknown>)[field];
    if (typeof message === "string" && message.trim()) {
      parsedErrors[field] = message;
    }
  }

  return Object.keys(parsedErrors).length > 0 ? parsedErrors : null;
}

function StorefrontHistoryEntry({
  entry,
}: {
  entry: VendorStorefrontHistoryEntry;
}) {
  const changes = Object.entries(entry.changes).map(([field, change]) => {
    const label = storefrontHistoryFieldLabels[field] ?? field;
    return `${label}: ${formatStorefrontHistoryValue(change.from)} → ${formatStorefrontHistoryValue(change.to)}`;
  });

  return (
    <div className="border-l-2 border-primary/40 pl-3 text-xs">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold uppercase tracking-wider text-foreground">
          {entry.action}
        </span>
        <span className="text-muted-foreground">
          {new Date(entry.changedAt).toLocaleString()}
        </span>
      </div>
      <p className="mt-1 text-muted-foreground">By {entry.actorUserId}</p>
      {changes.length > 0 && (
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {changes.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function VendorDashboardPage() {
  const { id = "" } = useParams();
  const {
    data: vendor,
    error,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetVendor(id, {
    query: {
      queryKey: getGetVendorQueryKey(id),
      retry: (failureCount, queryError) =>
        failureCount < 3 && queryError.status !== 403,
    },
  });
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<VendorFieldErrors>({});
  const [isRetrying, setIsRetrying] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const storefrontHistoryQuery = useListVendorStorefrontHistory(id, {
    query: {
      queryKey: getListVendorStorefrontHistoryQueryKey(id),
    },
  });
  const updateVendor = useUpdateVendor({
    mutation: {
      onSuccess: (updated) => {
        setFieldErrors({});
        queryClient.setQueryData(getGetVendorQueryKey(id), updated);
        queryClient.invalidateQueries({
          queryKey: getListVendorStorefrontHistoryQueryKey(id),
        });
        toast({ title: "Storefront saved" });
      },
      onError: (error) => {
        const validationErrors = getStorefrontFieldErrors(error);
        if (validationErrors) {
          setFieldErrors(validationErrors);
          toast({
            title: "Check storefront details",
            description: "Update the highlighted fields before trying again.",
            variant: "destructive",
          });
          return;
        }

        toast({ title: "Could not save storefront", variant: "destructive" });
      },
    },
  });
  const retryInProgress = isFetching || isRetrying;

  const retryDashboard = async () => {
    setIsRetrying(true);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    if (!vendor) return;
    setForm({
      businessName: vendor.businessName,
      contactName: vendor.contactName,
      email: vendor.email,
      phone: vendor.phone,
      location: vendor.location,
      category: vendor.category,
      plan:
        vendor.plan === "Growth" || vendor.plan === "Enterprise"
          ? vendor.plan
          : "Starter",
      description: vendor.description,
      logoUrl: vendor.logoUrl ?? "",
    });
  }, [vendor]);

  if (isLoading)
    return (
      <div className="min-h-screen pt-32 text-center">
        <Loader2 className="mx-auto animate-spin text-primary" />
      </div>
    );
  if ((isError && error?.status !== 403) || isRetrying)
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-20">
        <div
          className="flex max-w-md flex-col items-center border border-dashed border-border px-6 py-16 text-center"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          data-testid="state-vendor-dashboard-error"
        >
          <WifiOff className="h-8 w-8 text-primary" />
          <h1 className="mt-4 font-serif text-2xl font-semibold">
            The dashboard could not be loaded.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your connection and try again.
          </p>
          <Button
            type="button"
            variant="heroOutline"
            className="mt-6"
            onClick={() => void retryDashboard()}
            disabled={retryInProgress}
            aria-busy={retryInProgress}
            aria-label={
              retryInProgress
                ? "Retrying dashboard load"
                : "Try again to reload the dashboard"
            }
            data-testid="button-retry-vendor-dashboard"
          >
            <RotateCcw className={retryInProgress ? "animate-spin" : ""} />
            {retryInProgress ? "Trying again…" : "Try again"}
          </Button>
        </div>
      </div>
    );
  if (!vendor)
    return (
      <div className="min-h-screen pt-32 text-center text-muted-foreground">
        Vendor dashboard not found.
      </div>
    );

  const badgeVariant =
    vendor.status === "rejected"
      ? "destructive"
      : vendor.status === "approved"
        ? "default"
        : "secondary";

  return (
    <div className="min-h-screen px-4 pb-16 pt-28">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">
              Vendor dashboard
            </span>
            <h1 className="mt-2 font-serif text-4xl font-bold">
              {vendor.businessName}
            </h1>
            <div className="mt-3 flex items-center gap-3">
              <Badge variant={badgeVariant} className="capitalize">
                {vendor.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {vendor.status === "pending" &&
                  "Your application is being reviewed."}
                {vendor.status === "approved" && "Your storefront is live."}
                {vendor.status === "rejected" &&
                  (vendor.reviewNote || "Contact support before reapplying.")}
              </span>
            </div>
          </div>
          {vendor.status === "approved" && (
            <Button asChild variant="heroOutline">
              <Link to={`/store/${vendor.id}`}>
                View storefront <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const { email: _email, ...data } = form;
            updateVendor.mutate({
              id,
              data: { ...data, logoUrl: data.logoUrl || null },
            });
          }}
          className="space-y-7 rounded-sm border border-border bg-card p-6 md:p-10"
        >
          <div>
            <h2 className="font-serif text-2xl font-bold">
              Storefront details
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep your public brand story and business information current.
            </p>
          </div>
          <VendorFormFields
            form={form}
            setForm={setForm}
            includeEmail={false}
            fieldErrors={fieldErrors}
            onFieldChange={(field) => {
              setFieldErrors((current) => {
                if (!current[field]) return current;
                const next = { ...current };
                delete next[field];
                return next;
              });
            }}
          />
          <Button
            type="submit"
            variant="hero"
            disabled={updateVendor.isPending}
          >
            {updateVendor.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>

        <section className="rounded-sm border border-border bg-card p-6 md:p-10">
          <div className="mb-5 flex items-start gap-3">
            <History className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-serif text-2xl font-bold">
                Storefront change history
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Changes show who updated this storefront, which fields changed,
                and when. Administrators can use this to review edits made on
                behalf of a vendor.
              </p>
            </div>
          </div>
          {storefrontHistoryQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          )}
          {storefrontHistoryQuery.isError && (
            <p className="text-sm text-destructive">
              Storefront history could not be loaded.
            </p>
          )}
          {!storefrontHistoryQuery.isLoading &&
            !storefrontHistoryQuery.isError &&
            storefrontHistoryQuery.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No storefront changes have been recorded.
              </p>
            )}
          {storefrontHistoryQuery.data &&
            storefrontHistoryQuery.data.length > 0 && (
              <div className="space-y-4">
                {storefrontHistoryQuery.data.map((entry) => (
                  <StorefrontHistoryEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
        </section>

        <VendorProductManager
          vendorId={vendor.id}
          approved={vendor.status === "approved"}
        />
        <VendorOrderManager
          vendorId={vendor.id}
          enabled={vendor.status === "approved"}
        />
      </div>
    </div>
  );
}
