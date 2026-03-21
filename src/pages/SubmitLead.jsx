import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import LeadForm from "../components/leads/LeadForm";

export default function SubmitLead() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5">
            <Sparkles className="w-4 h-4" />
            Get in Touch
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Let's Start a Conversation
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Fill out the form below and our team will reach out within 24 hours.
          </p>
        </div>

        <Card className="border-0 shadow-xl shadow-primary/5 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8">
            <LeadForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          We respect your privacy. Your information will never be shared.
        </p>
      </motion.div>
    </div>
  );
}