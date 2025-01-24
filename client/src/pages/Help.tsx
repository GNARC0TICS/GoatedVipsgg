import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";

export default function Help() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#14151A] py-12">
        <main className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-8">
              Help & Support
            </h1>
            <div className="space-y-8">
              <section className="bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-lg border border-[#2A2B31]">
                <h2 className="text-2xl font-heading text-white mb-4">
                  24/7 Support
                </h2>
                <p className="text-[#8A8B91]">
                  Our support team is available 24/7 to assist you with any
                  questions or concerns.
                </p>
              </section>

              <section className="bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-lg border border-[#2A2B31]">
                <h2 className="text-2xl font-heading text-white mb-4">FAQs</h2>
                <div className="space-y-4 text-[#8A8B91]">
                  <p>
                    Find answers to commonly asked questions about our platform.
                  </p>
                </div>
              </section>

              <section className="bg-[#1A1B21]/50 backdrop-blur-sm p-6 rounded-lg border border-[#2A2B31]">
                <h2 className="text-2xl font-heading text-white mb-4">
                  Contact Us
                </h2>
                <p className="text-[#8A8B91]">
                  Email: support@goated.com
                  <br />
                  Discord: Join our community
                </p>
              </section>
            </div>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
