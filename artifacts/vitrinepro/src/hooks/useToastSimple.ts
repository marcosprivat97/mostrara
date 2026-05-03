import { useToast } from "@/hooks/use-toast";

export function useToastSimple() {
  const { toast } = useToast();

  const success = (title: string, description?: string) =>
    toast({ title, description });

  const error = (title: string, description?: string) =>
    toast({ title, description, variant: "destructive" });

  return { success, error };
}
