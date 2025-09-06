-- Activity logs table and helpful indexes for performance

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (
    type IN (
      'task_completed',
      'task_created',
      'document_uploaded',
      'compliance_created',
      'compliance_updated',
      'user_invited'
    )
  ),
  entity_type TEXT CHECK (entity_type IN ('task','document','compliance','user')),
  entity_id UUID,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and policies for activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company activities" ON public.activity_logs;
CREATE POLICY "Users can view company activities" ON public.activity_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert company activities" ON public.activity_logs;
CREATE POLICY "Users can insert company activities" ON public.activity_logs
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_compliances_company_due ON public.compliances(company_id, next_due_date);
CREATE INDEX IF NOT EXISTS idx_compliances_company_status ON public.compliances(company_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_compliance_due ON public.tasks(compliance_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_documents_company_uploaded ON public.documents(company_id, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_activity_company_created ON public.activity_logs(company_id, created_at);
