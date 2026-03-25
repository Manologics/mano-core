import PublicLeadForm from "../components/PublicLeadForm";

const BRAND = {
  name: "LIST MY CAR",
  emoji: "🚗",
  accentColor: "#3b82f6",
  tagline: "List your car fast. We handle the details.",
  source: "listmycar_lead_form",
};

export default function ListMyCarLeadForm() {
  return <PublicLeadForm brand={BRAND} />;
}