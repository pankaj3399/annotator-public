import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ScrollText } from 'lucide-react';

interface AcoladPolicyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const AcoladPolicyDialog: React.FC<AcoladPolicyDialogProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Shield className="h-6 w-6 text-blue-600" />
            Acolad Partnership Privacy Notice
          </DialogTitle>
          <DialogDescription className="text-base">
            Please review and accept the Acolad-specific privacy policies to continue with your registration.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <Alert className="bg-blue-50 border-blue-200">
            <ScrollText className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Important:</strong> This privacy notice applies specifically to vendors working in partnership with Acolad. 
              Your acceptance is required to proceed with registration for the Acolad team.
            </AlertDescription>
          </Alert>

          <div className="prose prose-sm max-w-none space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Privacy Notice for Vendors in Partnership with Acolad</h3>
              <p className="text-sm leading-relaxed">
                In accordance with the General Data Protection Regulation (EU) 2016/679 ("GDPR"), the UK GDPR, and other applicable privacy laws, 
                Acolad and its affiliated companies (hereinafter "Acolad"), acting as data controller, collect and process personal data of individuals 
                representing its vendors and partners (hereinafter the "Vendors").
              </p>
              <p className="text-sm leading-relaxed">
                This Privacy Notice explains how Acolad processes personal data of natural persons such as executives, directors, employees, agents, 
                or consultants acting on behalf of Vendors, and outlines their rights under applicable data protection laws.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">1. Purpose and Legal Basis for Processing</h4>
              <p className="text-sm leading-relaxed mb-2">Acolad processes personal data for the following purposes:</p>
              <p className="text-sm leading-relaxed mb-2">
                To manage access to and usage of the platform, including user registration, task assignment, communication, project delivery, and payment processing.
              </p>
              <p className="text-sm leading-relaxed mb-2">Categories of data processed may include:</p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Identification data (e.g., name, title)</li>
                <li>Contact details (e.g., email, phone number, address)</li>
                <li>Demographic data (e.g., gender, nationality, date of birth, accent)</li>
                <li>Professional data (e.g., language proficiency, skills, years of experience, CV/resume details)</li>
                <li>Platform usage data (e.g., login timestamps, task completion history, performance metrics)</li>
                <li>Payment and financial data (e.g., bank details, billing address, payment history)</li>
                <li>Communication records (e.g., emails, chat logs within the platform)</li>
                <li>Location data (e.g., IP address, country of residence, if applicable for compliance or payment)</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                Certain demographic data (such as gender, age group, or accent) may be collected for reporting purposes and to ensure balanced 
                and representative datasets, as required by specific training or evaluation projects.
              </p>
              <p className="text-sm leading-relaxed mt-2">The legal bases for processing include:</p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Performance of a contract (Art. 6(1)(b) GDPR)</li>
                <li>Compliance with legal obligations (Art. 6(1)(c) GDPR)</li>
                <li>Legitimate interests pursued by Acolad (Art. 6(1)(f) GDPR), such as ensuring effective vendor management and service delivery</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">2. Data Recipients and Third-Party Processors</h4>
              <p className="text-sm leading-relaxed mb-2">Personal data may be shared with:</p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Authorized personnel within Acolad</li>
                <li>Third-party service providers acting as data processors, who process data exclusively for the enforcement of the collaboration with Acolad, based on Acolad's documented instructions and under strict contractual obligations</li>
                <li>Public authorities or regulators, where required by law</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                Some processors may be located outside the European Economic Area (EEA), including in the United States. In such cases, Acolad ensures that:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>The third parties are bound by a Data Processing Agreement (DPA) with Acolad</li>
                <li>The DPA includes the European Commission's Standard Contractual Clauses (SCCs) to ensure an adequate level of data protection</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">3. Data Retention</h4>
              <p className="text-sm leading-relaxed">
                Acolad retains personal data only for as long as necessary to fulfill the purposes for which it was collected, or as required by applicable laws and regulations.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">4. Data Security</h4>
              <p className="text-sm leading-relaxed mb-2">
                Acolad implements appropriate technical and organizational measures to ensure the confidentiality, integrity, and availability of personal data, including:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Access controls and authentication systems</li>
                <li>Encryption and secure storage</li>
                <li>Regular audits and monitoring</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">5. Data Subject Rights</h4>
              <p className="text-sm leading-relaxed mb-2">Individuals whose data is processed have the following rights under the GDPR:</p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Right of access</li>
                <li>Right to rectification</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to restriction of processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                These rights can be exercised by contacting Acolad's Data Protection Officer at: 
                <a href="mailto:data-protection-team@acolad.com" className="text-blue-600 underline ml-1">
                  data-protection-team@acolad.com
                </a>
              </p>
              <p className="text-sm leading-relaxed">
                You also have the right to lodge a complaint with your local Data Protection Authority.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">6. Consent and Agreement</h4>
              <p className="text-sm leading-relaxed">
                By accepting these conditions you acknowledge that you have read and understood this Privacy Notice and consent to the processing 
                of personal data as described herein.
              </p>
              <p className="text-sm leading-relaxed mt-2 text-gray-600">
                <strong>Date of last update:</strong> May 28th, 2025
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={onAccept}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            I Accept Acolad Privacy Policies
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AcoladPolicyDialog;