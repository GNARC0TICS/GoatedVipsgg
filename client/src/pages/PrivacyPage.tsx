import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#14151A] text-white">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6 gap-2" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        
        <h1 className="text-3xl font-bold mb-6 text-[#D7FF00]">Privacy Policy</h1>
        
        <div className="space-y-6 prose prose-invert max-w-none">
          <p>
            This Privacy Policy describes how we collect, use, and handle your personal information
            when you use our services, websites, and applications.
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Information We Collect</h2>
          
          <p>
            We collect information to provide better services to our users. The types of information we collect include:
          </p>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account Information:</strong> When you create an account, we collect your name, email address, 
              and other information necessary for account setup.
            </li>
            <li>
              <strong>Usage Information:</strong> We collect information about how you use our services, 
              including your interaction with wager races, leaderboards, and other features.
            </li>
            <li>
              <strong>Device Information:</strong> We collect device-specific information such as your hardware model, 
              operating system version, unique device identifiers, and mobile network information.
            </li>
            <li>
              <strong>Log Information:</strong> When you use our services, we automatically collect and store certain information, 
              including details of how you used our service, IP address, and cookie data.
            </li>
          </ul>
          
          <h2 className="text-xl font-bold mt-8 mb-4">How We Use Information</h2>
          
          <p>
            We use the information we collect to:
          </p>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Develop new features and functionality</li>
            <li>Understand how users use our services</li>
            <li>Personalize your experience</li>
            <li>Communicate with you about our services</li>
            <li>Protect against fraudulent or illegal activity</li>
          </ul>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Information Sharing</h2>
          
          <p>
            We do not share personal information with companies, organizations, or individuals outside of our company except in the following cases:
          </p>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>With your consent</li>
            <li>For legal reasons</li>
            <li>With trusted service providers who work on our behalf</li>
          </ul>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Your Rights</h2>
          
          <p>
            Depending on your location, you may have certain rights regarding your personal information, including:
          </p>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>Access and download your personal information</li>
            <li>Correct or update your personal information</li>
            <li>Delete your personal information</li>
            <li>Object to or restrict certain processing of your data</li>
          </ul>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Security</h2>
          
          <p>
            We work hard to protect our users from unauthorized access to or unauthorized alteration, 
            disclosure, or destruction of information we hold. We maintain administrative, technical, 
            and physical safeguards designed to protect against unauthorized access, disclosure, alteration, or destruction.
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Changes to This Policy</h2>
          
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by posting 
            the new privacy policy on this page and updating the effective date.
          </p>
          
          <h2 className="text-xl font-bold mt-8 mb-4">Contact Us</h2>
          
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          
          <p className="text-[#D7FF00]">privacy@goated-rewards.com</p>
          
          <p className="mt-8 text-sm text-gray-400">Last Updated: March 4, 2025</p>
        </div>
      </div>
    </div>
  );
}