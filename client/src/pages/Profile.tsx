import { EmailVerificationStatus } from '../components/EmailVerificationStatus';

function Profile() {
  const { user } = useUser();

  return (
    <div className="space-y-6">
        <section className="bg-[#1A1B21]/30 p-6 rounded-lg border border-[#2A2B31]">
          <h2 className="text-xl font-heading text-white mb-4">Account Verification</h2>
          <EmailVerificationStatus isVerified={user?.emailVerified} email={user?.email} />
        </section>
        {/* Profile content */}
    </div>
  );
}

export default Profile;