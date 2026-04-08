import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Message sent!", description: "We'll get back to you soon." });
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16 space-y-3">
          <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Get in Touch</span>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">Contact Us</h1>
          <p className="text-muted-foreground font-sans max-w-md mx-auto">
            Have a question, partnership inquiry, or just want to say hello? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-sans font-medium text-foreground mb-1.5 block">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={100}
                className="w-full h-11 px-4 rounded-sm bg-muted border border-border text-foreground placeholder:text-muted-foreground font-sans text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-sm font-sans font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                maxLength={255}
                className="w-full h-11 px-4 rounded-sm bg-muted border border-border text-foreground placeholder:text-muted-foreground font-sans text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-sans font-medium text-foreground mb-1.5 block">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                maxLength={1000}
                rows={5}
                className="w-full px-4 py-3 rounded-sm bg-muted border border-border text-foreground placeholder:text-muted-foreground font-sans text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                placeholder="How can we help?"
              />
            </div>
            <Button variant="hero" size="lg" type="submit" className="w-full">Send Message</Button>
          </form>

          <div className="space-y-8">
            {[
              { icon: MapPin, label: "Address", value: "Victoria Island, Lagos, Nigeria" },
              { icon: Mail, label: "Email", value: "ellprimegroup@gmail.com", href: "mailto:ellprimegroup@gmail.com" },
              { icon: Phone, label: "Phone", value: "+234 816 075 0288", href: "tel:+2348160750288" },
            ].map((item) => (
              <div key={item.label} className="flex gap-4">
                <div className="w-12 h-12 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-sans font-medium text-foreground">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors font-sans">{item.value}</a>
                  ) : (
                    <p className="text-sm text-muted-foreground font-sans">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
