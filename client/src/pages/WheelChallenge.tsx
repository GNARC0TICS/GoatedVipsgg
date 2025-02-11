import { PageTransition } from "@/components/PageTransition";

export default function WheelChallenge() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#1A1B21] text-white flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-center mb-6">Under Maintenance</h1>
        <p className="text-[#8A8B91]">This feature is currently being updated. Please check back later.</p>
      </div>
    </PageTransition>
  );
}