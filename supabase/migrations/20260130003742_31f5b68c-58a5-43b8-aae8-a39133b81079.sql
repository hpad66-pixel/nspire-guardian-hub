-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'inspector', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  year_built INTEGER,
  total_units INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  nspire_enabled BOOLEAN DEFAULT false,
  projects_enabled BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Units table
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  unit_number TEXT NOT NULL,
  floor INTEGER,
  bedrooms INTEGER DEFAULT 1,
  bathrooms NUMERIC(3,1) DEFAULT 1,
  square_feet INTEGER,
  status TEXT DEFAULT 'occupied',
  last_inspection_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inspection area enum
CREATE TYPE public.inspection_area AS ENUM ('outside', 'inside', 'unit');

-- Severity level enum
CREATE TYPE public.severity_level AS ENUM ('low', 'moderate', 'severe');

-- Inspections table
CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  area inspection_area NOT NULL,
  inspector_id UUID REFERENCES auth.users(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'in_progress',
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Defects table (inspection findings)
CREATE TABLE public.defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL,
  nspire_item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  defect_condition TEXT NOT NULL,
  severity severity_level NOT NULL,
  repair_deadline DATE NOT NULL,
  proof_required BOOLEAN DEFAULT false,
  photo_urls TEXT[],
  notes TEXT,
  repaired_at TIMESTAMP WITH TIME ZONE,
  repair_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Issue source enum
CREATE TYPE public.issue_source AS ENUM ('core', 'nspire', 'projects');

-- Issues table (cross-module spine)
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  defect_id UUID REFERENCES public.defects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_module issue_source NOT NULL DEFAULT 'core',
  area inspection_area,
  severity severity_level NOT NULL DEFAULT 'low',
  deadline DATE,
  proof_required BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Properties policies (all authenticated users can read, admins/managers can write)
CREATE POLICY "Authenticated users can view properties" ON public.properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can insert properties" ON public.properties FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admins and managers can update properties" ON public.properties FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admins can delete properties" ON public.properties FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Units policies
CREATE POLICY "Authenticated users can view units" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can insert units" ON public.units FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admins and managers can update units" ON public.units FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admins can delete units" ON public.units FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Inspections policies
CREATE POLICY "Authenticated users can view inspections" ON public.inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inspectors can create inspections" ON public.inspections FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'inspector')
);
CREATE POLICY "Inspectors can update inspections" ON public.inspections FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR inspector_id = auth.uid()
);

-- Defects policies
CREATE POLICY "Authenticated users can view defects" ON public.defects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inspectors can create defects" ON public.defects FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'inspector')
);
CREATE POLICY "Inspectors can update defects" ON public.defects FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'inspector')
);

-- Issues policies
CREATE POLICY "Authenticated users can view issues" ON public.issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create issues" ON public.issues FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update issues they created or are assigned to" ON public.issues FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR created_by = auth.uid() OR assigned_to = auth.uid()
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile and assign default role on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_defects_updated_at BEFORE UPDATE ON public.defects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();