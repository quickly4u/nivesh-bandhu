import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Company } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export const CompanyPage: React.FC = () => {
  const { profile } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!profile?.company_id) return;
      try {
        const { data, error } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
        if (error) throw error;
        const row = data as any;
        const addr = (row?.registered_address ?? {}) as any;
        const mapped: Company = {
          id: row.id,
          name: row.name,
          cin: row.cin,
          pan: row.pan,
          gstin: row.gstin ?? undefined,
          state: row.state,
          business_type: row.business_type,
          annual_turnover: Number(row.annual_turnover) || 0,
          employee_count: Number(row.employee_count) || 0,
          incorporation_date: row.incorporation_date,
          registered_address: {
            line1: addr.line1 ?? '',
            line2: addr.line2 ?? undefined,
            city: addr.city ?? '',
            state: addr.state ?? '',
            pincode: addr.pincode ?? '',
          },
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
        setCompany(mapped);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCompany();
  }, [profile?.company_id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
        <p className="text-muted-foreground">View and manage your company details</p>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
          <CardDescription>Company details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!company ? (
            <div className="h-24 animate-pulse bg-muted rounded" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="font-medium">{company.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CIN</span>
                <span className="font-medium">{company.cin}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">PAN</span>
                <span className="font-medium">{company.pan}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">State</span>
                <span className="font-medium">{company.state}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Business Type</span>
                <span className="font-medium capitalize">{company.business_type}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyPage;
