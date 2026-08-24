// Type declarations for Deno runtime in Supabase Edge Functions
declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.0" {
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): any;
}
