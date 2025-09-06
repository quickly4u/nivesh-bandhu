import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Building2, Users, FileText, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface CompanyBasicInfo {
  name: string;
  cin: string;
  pan: string;
  gstin?: string;
}

interface BusinessDetails {
  annual_turnover: number;
  employee_count: number;
  state: string;
  business_type: 'manufacturing' | 'services' | 'trading';
  incorporation_date: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  pincode: string;
}

interface UserSetup {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

interface OnboardingData {
  companyBasic: CompanyBasicInfo;
  businessDetails: BusinessDetails;
  userSetup: UserSetup;
}

const INDIAN_STATES = [
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CT', name: 'Chhattisgarh' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OR', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TG', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UT', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'DL', name: 'Delhi' },
];

export const OnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [applicableCompliances, setApplicableCompliances] = useState<any[]>([]);
  const { signUp, updateProfileWithCompany } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const companyBasicForm = useForm<CompanyBasicInfo>();
  const businessDetailsForm = useForm<BusinessDetails>();
  const userSetupForm = useForm<UserSetup>();

  const progress = (currentStep / 4) * 100;

  const validateCIN = (cin: string) => {
    const cinRegex = /^[LUF]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;
    return cinRegex.test(cin) || 'Invalid CIN format';
  };

  const validatePAN = (pan: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan) || 'Invalid PAN format';
  };

  const validateGSTIN = (gstin: string) => {
    if (!gstin) return true; // Optional field
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin) || 'Invalid GSTIN format';
  };

  const generateApplicableCompliances = (businessData: BusinessDetails) => {
    const compliances = [];

    // Tax Compliances
    if (businessData.annual_turnover > 15000000) { // > 1.5 Cr
      compliances.push({
        name: 'GST Monthly Return (GSTR-1 & GSTR-3B)',
        type: 'tax',
        frequency: 'monthly',
        regulatory_body: 'CBIC',
        reason: 'Annual turnover exceeds ₹1.5 Crores'
      });
    } else {
      compliances.push({
        name: 'GST Quarterly Return (GSTR-1 & GSTR-3B)',
        type: 'tax',
        frequency: 'quarterly',
        regulatory_body: 'CBIC',
        reason: 'Annual turnover is ₹1.5 Crores or below'
      });
    }

    // Labor Compliances
    if (businessData.employee_count >= 10) {
      compliances.push({
        name: 'Provident Fund (PF) Monthly Return',
        type: 'labor',
        frequency: 'monthly',
        regulatory_body: 'EPFO',
        reason: 'Employee count is 10 or more'
      });
      
      compliances.push({
        name: 'Employee State Insurance (ESI) Monthly Return',
        type: 'labor',
        frequency: 'monthly',
        regulatory_body: 'ESIC',
        reason: 'Employee count is 10 or more'
      });
    }

    // Professional Tax (state-specific)
    const professionalTaxStates = ['MH', 'KA', 'TN', 'WB', 'AS', 'MP', 'GJ'];
    if (professionalTaxStates.includes(businessData.state)) {
      compliances.push({
        name: 'Professional Tax Monthly Return',
        type: 'labor',
        frequency: 'monthly',
        regulatory_body: 'STATE',
        reason: `Required in ${businessData.state}`
      });
    }

    // Corporate Compliances (All private companies)
    compliances.push({
      name: 'Annual Return (MGT-7)',
      type: 'corporate',
      frequency: 'annual',
      regulatory_body: 'MCA',
      reason: 'Mandatory for all private companies'
    });

    compliances.push({
      name: 'Financial Statements (AOC-4)',
      type: 'corporate',
      frequency: 'annual',
      regulatory_body: 'MCA',
      reason: 'Mandatory for all private companies'
    });

    compliances.push({
      name: 'Board Meetings',
      type: 'corporate',
      frequency: 'quarterly',
      regulatory_body: 'MCA',
      reason: 'Minimum 4 meetings per year required'
    });

    compliances.push({
      name: 'Director KYC (DIR-3 KYC)',
      type: 'corporate',
      frequency: 'annual',
      regulatory_body: 'MCA',
      reason: 'Required for all directors annually'
    });

    return compliances;
  };

  const handleStepSubmit = async (stepData: any) => {
    setIsLoading(true);
    
    try {
      if (currentStep === 1) {
        setOnboardingData(prev => ({ ...prev, companyBasic: stepData }));
        setCurrentStep(2);
      } else if (currentStep === 2) {
        const compliances = generateApplicableCompliances(stepData);
        setApplicableCompliances(compliances);
        setOnboardingData(prev => ({ ...prev, businessDetails: stepData }));
        setCurrentStep(3);
      } else if (currentStep === 3) {
        setOnboardingData(prev => ({ ...prev, userSetup: stepData }));
        setCurrentStep(4);
      } else if (currentStep === 4) {
        // Complete onboarding - create account and company
        await completeOnboarding();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    const { companyBasic, businessDetails, userSetup } = onboardingData as OnboardingData;
    
    try {
      // 1) Create company first (allowed as anon due to permissive INSERT policy)
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyBasic.name,
          cin: companyBasic.cin,
          pan: companyBasic.pan,
          gstin: companyBasic.gstin,
          state: businessDetails.state,
          business_type: businessDetails.business_type,
          annual_turnover: businessDetails.annual_turnover,
          employee_count: businessDetails.employee_count,
          incorporation_date: businessDetails.incorporation_date,
          registered_address: {
            line1: businessDetails.address_line1,
            line2: businessDetails.address_line2,
            city: businessDetails.city,
            state: businessDetails.state,
            pincode: businessDetails.pincode,
          },
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // 2) Prepare compliances to be inserted after login (RLS requires profile linkage)
      const pendingCompliances = applicableCompliances.map((c) => ({
        name: c.name,
        description: c.reason,
        regulatory_body: c.regulatory_body,
        type: c.type,
        frequency: c.frequency,
        priority: c.type === 'tax' ? 'high' : 'medium',
        next_due_date: getNextDueDate(c.frequency).toISOString().split('T')[0],
        status: 'pending',
        is_active: true,
      }));

      // 3) Stash pending onboarding data locally to finish after login
      localStorage.setItem('pending_company_id', companyData.id);
      localStorage.setItem('pending_compliances', JSON.stringify(pendingCompliances));
      localStorage.setItem('pending_phone', userSetup.phone);

      // 4) Create user account (may require email confirmation → no session yet)
      const { error: signUpError } = await signUp(userSetup.email, userSetup.password, {
        name: userSetup.name,
        phone: userSetup.phone,
        existing_company_id: companyData.id,
        company_name: companyBasic.name,
        company_cin: companyBasic.cin,
        company_pan: companyBasic.pan,
        company_gstin: companyBasic.gstin || '',
        company_state: businessDetails.state,
        company_business_type: businessDetails.business_type,
        company_annual_turnover: businessDetails.annual_turnover,
        company_employee_count: businessDetails.employee_count,
        company_incorporation_date: businessDetails.incorporation_date,
        company_address: {
          line1: businessDetails.address_line1,
          line2: businessDetails.address_line2,
          city: businessDetails.city,
          state: businessDetails.state,
          pincode: businessDetails.pincode,
        },
      });

      if (signUpError) throw signUpError;

      toast({
        title: 'Account Created',
        description: 'Please check your email to verify your account. We will finish setting up your workspace after you login.',
      });

      // 5) Send user to auth page to login after email verification
      navigate('/auth');

    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Onboarding Error',
        description: error.message ?? 'Something went wrong while creating your company.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getNextDueDate = (frequency: string) => {
    const now = new Date();
    switch (frequency) {
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 11); // 11th of next month
      case 'quarterly':
        return new Date(now.getFullYear(), now.getMonth() + 3, 15); // 15th of quarter end
      case 'annual':
        return new Date(now.getFullYear() + 1, 2, 30); // March 30th next year
      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, 15);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <form onSubmit={companyBasicForm.handleSubmit(handleStepSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                placeholder="Enter your company name"
                {...companyBasicForm.register('name', { required: 'Company name is required' })}
              />
              {companyBasicForm.formState.errors.name && (
                <p className="text-sm text-error">{companyBasicForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cin">Corporate Identity Number (CIN) *</Label>
              <Input
                id="cin"
                placeholder="L99999XX2023PLC123456"
                {...companyBasicForm.register('cin', { 
                  required: 'CIN is required',
                  validate: validateCIN
                })}
              />
              {companyBasicForm.formState.errors.cin && (
                <p className="text-sm text-error">{companyBasicForm.formState.errors.cin.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pan">PAN Number *</Label>
              <Input
                id="pan"
                placeholder="ABCDE1234F"
                {...companyBasicForm.register('pan', { 
                  required: 'PAN is required',
                  validate: validatePAN
                })}
              />
              {companyBasicForm.formState.errors.pan && (
                <p className="text-sm text-error">{companyBasicForm.formState.errors.pan.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN (Optional)</Label>
              <Input
                id="gstin"
                placeholder="22AAAAA0000A1Z5"
                {...companyBasicForm.register('gstin', { validate: validateGSTIN })}
              />
              {companyBasicForm.formState.errors.gstin && (
                <p className="text-sm text-error">{companyBasicForm.formState.errors.gstin.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Continue'}
            </Button>
          </form>
        );

      case 2:
        return (
          <form onSubmit={businessDetailsForm.handleSubmit(handleStepSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="annual_turnover">Annual Turnover (₹) *</Label>
                <Input
                  id="annual_turnover"
                  type="number"
                  placeholder="5000000"
                  {...businessDetailsForm.register('annual_turnover', { 
                    required: 'Annual turnover is required',
                    min: { value: 0, message: 'Must be positive' }
                  })}
                />
                {businessDetailsForm.formState.errors.annual_turnover && (
                  <p className="text-sm text-error">{businessDetailsForm.formState.errors.annual_turnover.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_count">Employee Count *</Label>
                <Input
                  id="employee_count"
                  type="number"
                  placeholder="25"
                  {...businessDetailsForm.register('employee_count', { 
                    required: 'Employee count is required',
                    min: { value: 1, message: 'Must be at least 1' }
                  })}
                />
                {businessDetailsForm.formState.errors.employee_count && (
                  <p className="text-sm text-error">{businessDetailsForm.formState.errors.employee_count.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select onValueChange={(value) => businessDetailsForm.setValue('state', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_type">Business Type *</Label>
                <Select onValueChange={(value) => businessDetailsForm.setValue('business_type', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="trading">Trading</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incorporation_date">Incorporation Date *</Label>
              <Input
                id="incorporation_date"
                type="date"
                {...businessDetailsForm.register('incorporation_date', { required: 'Incorporation date is required' })}
              />
              {businessDetailsForm.formState.errors.incorporation_date && (
                <p className="text-sm text-error">{businessDetailsForm.formState.errors.incorporation_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line1">Registered Address Line 1 *</Label>
              <Input
                id="address_line1"
                placeholder="Building name, street"
                {...businessDetailsForm.register('address_line1', { required: 'Address is required' })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
              <Input
                id="address_line2"
                placeholder="Area, locality"
                {...businessDetailsForm.register('address_line2')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Mumbai"
                  {...businessDetailsForm.register('city', { required: 'City is required' })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  placeholder="400001"
                  {...businessDetailsForm.register('pincode', { 
                    required: 'Pincode is required',
                    pattern: { value: /^\d{6}$/, message: 'Invalid pincode' }
                  })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Continue'}
              </Button>
            </div>
          </form>
        );

      case 3:
        return (
          <form onSubmit={userSetupForm.handleSubmit(handleStepSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Full Name *</Label>
              <Input
                id="user-name"
                placeholder="Enter your full name"
                {...userSetupForm.register('name', { required: 'Name is required' })}
              />
              {userSetupForm.formState.errors.name && (
                <p className="text-sm text-error">{userSetupForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="Enter your email"
                {...userSetupForm.register('email', { required: 'Email is required' })}
              />
              {userSetupForm.formState.errors.email && (
                <p className="text-sm text-error">{userSetupForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-phone">Phone Number *</Label>
              <Input
                id="user-phone"
                placeholder="9876543210"
                {...userSetupForm.register('phone', { 
                  required: 'Phone is required',
                  pattern: { value: /^\d{10}$/, message: 'Invalid phone number' }
                })}
              />
              {userSetupForm.formState.errors.phone && (
                <p className="text-sm text-error">{userSetupForm.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-password">Password *</Label>
              <Input
                id="user-password"
                type="password"
                placeholder="Create a strong password"
                {...userSetupForm.register('password', { 
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                })}
              />
              {userSetupForm.formState.errors.password && (
                <p className="text-sm text-error">{userSetupForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-confirm">Confirm Password *</Label>
              <Input
                id="user-confirm"
                type="password"
                placeholder="Confirm your password"
                {...userSetupForm.register('confirmPassword', { 
                  required: 'Please confirm your password',
                  validate: (value) => value === userSetupForm.watch('password') || 'Passwords do not match'
                })}
              />
              {userSetupForm.formState.errors.confirmPassword && (
                <p className="text-sm text-error">{userSetupForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Continue'}
              </Button>
            </div>
          </form>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Review Your Applicable Compliances</h3>
              <p className="text-muted-foreground">
                Based on your company profile, we've identified the following compliance requirements:
              </p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {applicableCompliances.map((compliance, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{compliance.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{compliance.reason}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {compliance.frequency}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                          {compliance.regulatory_body}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(3)} className="flex-1">
                Back
              </Button>
              <Button onClick={() => handleStepSubmit({})} className="flex-1" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Complete Setup'}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <Building2 className="h-5 w-5" />;
      case 2: return <Users className="h-5 w-5" />;
      case 3: return <Shield className="h-5 w-5" />;
      case 4: return <FileText className="h-5 w-5" />;
      default: return null;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return 'Company Information';
      case 2: return 'Business Details';
      case 3: return 'User Account';
      case 4: return 'Review & Complete';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to ComplianceHub</h1>
          <p className="text-muted-foreground">
            Let's set up your company profile to get started with compliance management
          </p>
        </div>

        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {getStepIcon(currentStep)}
                <CardTitle>{getStepTitle(currentStep)}</CardTitle>
              </div>
              <span className="text-sm text-muted-foreground">
                Step {currentStep} of 4
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
