import PublicLeadForm from "../components/PublicLeadForm";

const BRAND = {
  name: "VENDORFY",
  emoji: "🏪",
  accentColor: "#f59e0b",
  tagline: "Connect with the right vendors for your business.",
  source: "vendorfy_lead_form",
};

export default function VendorfyLeadForm() {
  return <PublicLeadForm brand={BRAND} />;
}