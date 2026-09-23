import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type VendorForm = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  location: string;
  category: string;
  plan: "Starter" | "Growth" | "Enterprise";
  description: string;
  logoUrl: string;
};

export type VendorFieldErrors = Partial<Record<keyof VendorForm, string>>;

type Props = {
  form: VendorForm;
  setForm: (form: VendorForm) => void;
  includeEmail?: boolean;
  fieldErrors?: VendorFieldErrors;
  onFieldChange?: (field: keyof VendorForm) => void;
};

const fieldClass = "bg-muted border-border";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export default function VendorFormFields({
  form,
  setForm,
  includeEmail = true,
  fieldErrors = {},
  onFieldChange,
}: Props) {
  const update = (key: keyof VendorForm, value: string) => {
    setForm({ ...form, [key]: value });
    onFieldChange?.(key);
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          value={form.businessName}
          onChange={(e) => update("businessName", e.target.value)}
          minLength={2}
          maxLength={120}
          required
          aria-invalid={Boolean(fieldErrors.businessName)}
          aria-describedby={
            fieldErrors.businessName ? "businessName-error" : undefined
          }
          className={`${fieldClass} ${
            fieldErrors.businessName ? "border-destructive" : ""
          }`}
        />
        <FieldError
          id="businessName-error"
          message={fieldErrors.businessName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactName">Contact name</Label>
        <Input
          id="contactName"
          value={form.contactName}
          onChange={(e) => update("contactName", e.target.value)}
          minLength={2}
          maxLength={120}
          required
          aria-invalid={Boolean(fieldErrors.contactName)}
          aria-describedby={
            fieldErrors.contactName ? "contactName-error" : undefined
          }
          className={`${fieldClass} ${
            fieldErrors.contactName ? "border-destructive" : ""
          }`}
        />
        <FieldError id="contactName-error" message={fieldErrors.contactName} />
      </div>
      {includeEmail && (
        <div className="space-y-2">
          <Label htmlFor="email">Business email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            maxLength={255}
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={`${fieldClass} ${
              fieldErrors.email ? "border-destructive" : ""
            }`}
          />
          <FieldError id="email-error" message={fieldErrors.email} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          minLength={7}
          maxLength={30}
          required
          aria-invalid={Boolean(fieldErrors.phone)}
          aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
          className={`${fieldClass} ${
            fieldErrors.phone ? "border-destructive" : ""
          }`}
        />
        <FieldError id="phone-error" message={fieldErrors.phone} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">City and country</Label>
        <Input
          id="location"
          value={form.location}
          onChange={(e) => update("location", e.target.value)}
          minLength={2}
          maxLength={160}
          required
          aria-invalid={Boolean(fieldErrors.location)}
          aria-describedby={fieldErrors.location ? "location-error" : undefined}
          className={`${fieldClass} ${
            fieldErrors.location ? "border-destructive" : ""
          }`}
        />
        <FieldError id="location-error" message={fieldErrors.location} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Primary category</Label>
        <Select
          value={form.category}
          onValueChange={(value) => update("category", value)}
        >
          <SelectTrigger
            id="category"
            aria-invalid={Boolean(fieldErrors.category)}
            aria-describedby={
              fieldErrors.category ? "category-error" : undefined
            }
            className={`${fieldClass} ${
              fieldErrors.category ? "border-destructive" : ""
            }`}
          >
            <SelectValue placeholder="Choose a category">
              {form.category || undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[
              "Fabrics",
              "Women's Fashion",
              "Men's Fashion",
              "Accessories",
              "Footwear",
              "Cultural Fashion",
            ].map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id="category-error" message={fieldErrors.category} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan">Plan</Label>
        <Select
          value={form.plan}
          onValueChange={(value: VendorForm["plan"]) => update("plan", value)}
        >
          <SelectTrigger
            id="plan"
            aria-invalid={Boolean(fieldErrors.plan)}
            aria-describedby={fieldErrors.plan ? "plan-error" : undefined}
            className={`${fieldClass} ${
              fieldErrors.plan ? "border-destructive" : ""
            }`}
          >
            <SelectValue>{form.plan}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {["Starter", "Growth", "Enterprise"].map((plan) => (
              <SelectItem key={plan} value={plan}>
                {plan}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id="plan-error" message={fieldErrors.plan} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="logoUrl">
          Logo image URL{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="logoUrl"
          type="url"
          value={form.logoUrl}
          onChange={(e) => update("logoUrl", e.target.value)}
          maxLength={1000}
          placeholder="https://…"
          aria-invalid={Boolean(fieldErrors.logoUrl)}
          aria-describedby={fieldErrors.logoUrl ? "logoUrl-error" : undefined}
          className={`${fieldClass} ${
            fieldErrors.logoUrl ? "border-destructive" : ""
          }`}
        />
        <FieldError id="logoUrl-error" message={fieldErrors.logoUrl} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Brand story</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          minLength={20}
          maxLength={1200}
          rows={5}
          required
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={
            fieldErrors.description ? "description-error" : undefined
          }
          className={`${fieldClass} ${
            fieldErrors.description ? "border-destructive" : ""
          }`}
          placeholder="Tell buyers about your craft, materials, and heritage."
        />
        <FieldError id="description-error" message={fieldErrors.description} />
        <p className="text-xs text-muted-foreground">
          {form.description.length}/1200 characters
        </p>
      </div>
    </div>
  );
}
