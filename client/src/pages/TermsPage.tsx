import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6 gap-2" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        
        <h1 className="text-3xl font-bold mb-6 text-[#D7FF00]">Terms of Service</h1>
        
        <div className="space-y-6 prose prose-invert max-w-none">
          <p>
            These Terms of Service ("Terms") govern your access to and use of our services, 
            including our website, Telegram bot, and any other software or services offered by us 
            in connection with any of the above (the "Services").
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Acceptance of Terms</h2>
          
          <p>
            By accessing or using our Services, you agree to be bound by these Terms. If you do not agree 
            to these Terms, you may not access or use the Services.
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Eligibility</h2>
          
          <p>
            You must be at least 18 years old to use our Services. By using our Services, you represent and 
            warrant that you meet this requirement.
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Account Registration</h2>
          
          <p>
            To access certain features of our Services, you may be required to register for an account. 
            When you register, you agree to provide accurate, current, and complete information about yourself.
          </p>
          
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all 
            activities that occur under your account. You agree to immediately notify us of any unauthorized 
            use of your account.
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">User Conduct</h2>
          
          <p>
            You agree not to engage in any of the following prohibited activities:
          </p>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Using the Services for any illegal purpose or in violation of any laws or regulations
            </li>
            <li>
              Attempting to interfere with, compromise the system integrity or security, or decipher 
              any transmissions to or from the servers running the Services
            </li>
            <li>
              Using automated means, including spiders, robots, crawlers, data mining tools, or similar 
              methods to access the Services
            </li>
            <li>
              Attempting to access or search the Services through any means other than the interfaces 
              that we provide
            </li>
            <li>
              Engaging in any harassing, intimidating, predatory, or stalking conduct
            </li>
          </ul>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Wagering and Rewards</h2>
          
          <p>
            Our platform tracks wager statistics from Goated.com. The accuracy of these statistics depends on 
            the data provided by Goated.com. While we strive to ensure accuracy, we cannot guarantee the 
            correctness of all data.
          </p>
          
          <p>
            Prizes and rewards issued on our platform are subject to our sole discretion. We reserve the right 
            to modify, suspend, or terminate any rewards program at any time without notice.
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Termination</h2>
          
          <p>
            We reserve the right to suspend or terminate your access to the Services at any time, without 
            notice, for any reason, including if we believe that you have violated these Terms.
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Disclaimer of Warranties</h2>
          
          <p>
            The Services are provided "as is" and "as available" without any warranties of any kind, 
            either express or implied, including but not limited to the implied warranties of merchantability, 
            fitness for a particular purpose, or non-infringement.
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Limitation of Liability</h2>
          
          <p>
            To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, 
            special, consequential, or punitive damages, including loss of profits, data, or goodwill, 
            arising out of or in connection with your use of the Services.
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Changes to Terms</h2>
          
          <p>
            We may update these Terms from time to time. If we make significant changes, we will notify 
            you by posting a notice on our website or sending you an email. Your continued use of the Services 
            after such notice constitutes your acceptance of the changes.
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Contact Information</h2>
          
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          
          <p className="text-[#D7FF00]">terms@goated-rewards.com</p>
          
          <p className="mt-8 text-sm text-gray-400">Last Updated: March 4, 2025</p>
        </div>
      </div>
    </div>
  );
}