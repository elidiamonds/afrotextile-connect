import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  getGetVendorQueryKey,
  useGetVendor,
  useUpdateVendor,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VendorFormFields, {
  type VendorForm,
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

export default function VendorDashboardPage() {
  const { id = "" } = useParams();
  const { data: vendor, isLoading, isError } = useGetVendor(id);
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateVendor = useUpdateVendor({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetVendorQueryKey(id), updated);
        toast({ title: "Storefront saved" });
      },
      onError: () =>
        toast({ title: "Could not save storefront", variant: "destructive" }),
    },
  });

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
  if (isError || !vendor)
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
          />
          <Button
            type="submit"
            variant="hero"
            disabled={updateVendor.isPending}
          >
            {updateVendor.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>

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
