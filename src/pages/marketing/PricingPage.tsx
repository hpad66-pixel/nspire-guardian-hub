import { ArrowRight, Building2, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#061f1a] px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#e2bd76]">Enterprise access</p>
        <h1 className="mt-5 font-display text-5xl font-medium leading-none tracking-normal sm:text-7xl">
          Enterprise pricing is scoped by conversation, not a public price card.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
          We configure the platform around your projects, properties, voice agents, financial controls,
          portals, CRM workflow, and support model. Tell us what you need first and the team will follow up.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            [Building2, "Portfolio and project setup"],
            [Sparkles, "AI and voice workflows"],
            [ShieldCheck, "Security and access design"],
          ].map(([Icon, label]) => {
            const TileIcon = Icon as typeof Building2;
            return (
              <div key={label as string} className="border border-white/15 bg-white/[0.06] p-5">
                <TileIcon className="h-5 w-5 text-[#e2bd76]" />
                <p className="mt-4 text-sm font-bold">{label as string}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/landing#contact"
            className="inline-flex min-h-12 items-center gap-2 bg-[#e2bd76] px-5 text-sm font-extrabold text-[#14251f]"
          >
            Contact us <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/landing"
            className="inline-flex min-h-12 items-center border border-white/20 px-5 text-sm font-bold text-white/85"
          >
            Return to the product page
          </Link>
        </div>
      </div>
    </main>
  );
}
