import { supabase } from '@/integrations/supabase/client';
export async function medicineCall(body:Record<string,unknown>) { const {data,error}=await supabase.functions.invoke('medicine-fridge',{body});if(error || data?.error)throw new Error('לא הצלחנו להשלים כרגע. בדקי את הפרטים ונסי שוב מאוחר יותר.');return data; }
export type Listing = {id:string;drug_name:string;dose:string;quantity:string;expiry_month:string;sealed:boolean;area:string;city:string;volunteer_transfer:boolean;nickname:string;contact_mode:string;status:string;created_at:string};
