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

type Props = {
  form: VendorForm;
  setForm: (form: VendorForm) => void;
  includeEmail?: boolean;
};

const fieldClass = "bg-muted border-border";

export default function VendorFormFields({
  form,
  setForm,
  includeEmail = true,
}: Props) {
  const update = (key: keyof VendorForm, value: string) =>
    setForm({ ...form, [key]: value });

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
          className={fieldClass}
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
          className={fieldClass}
        />
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
            className={fieldClass}
          />
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
          className={fieldClass}
        />
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
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <Label>Primary category</Label>
        <Select
          value={form.category}
          onValueChange={(value) => update("category", value)}
        >
          <SelectTrigger className={fieldClass}>
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
      </div>
      <div className="space-y-2">
        <Label>Plan</Label>
        <Select
          value={form.plan}
          onValueChange={(value: VendorForm["plan"]) => update("plan", value)}
        >
          <SelectTrigger className={fieldClass}>
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
          className={fieldClass}
        />
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
          className={fieldClass}
          placeholder="Tell buyers about your craft, materials, and heritage."
        />
        <p className="text-xs text-muted-foreground">
          {form.description.length}/1200 characters
        </p>
      </div>
    </div>
  );
}
