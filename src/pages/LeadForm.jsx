import PublicLeadForm from "../components/PublicLeadForm";

const BRAND = {
  name: "MONKEE BIZZ AI",
  emoji: "🐒",
  accentColor: "#00ff88",
  tagline: "Tell us about your business and we'll reach out with a custom plan.",
  source: "monkeebizzai_lead_form",
};

export default function LeadForm() {
  return <PublicLeadForm brand={BRAND} />;
}