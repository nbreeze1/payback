// Hand-written types for the Supabase tables (charges, payments).

export const CATEGORIES = {
  school: "School",
  credit_card: "Credit card",
  flight: "Flights",
  phone: "Phone bill",
  other: "Other",
} as const;

export type Category = keyof typeof CATEGORIES;

export type Charge = {
  id: string;
  user_id: string | null;
  title: string;
  category: Category;
  amount: number;
  charged_on: string;
  notes: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  user_id: string | null;
  amount: number;
  paid_on: string;
  method: string | null;
  notes: string | null;
  created_at: string;
};

type Insert<T> = Omit<T, "id" | "user_id" | "created_at"> &
  Partial<Pick<T & { id: string; user_id: string | null; created_at: string }, "id" | "user_id" | "created_at">>;

export type Database = {
  public: {
    Tables: {
      charges: {
        Row: Charge;
        Insert: Insert<Omit<Charge, "notes">> & { notes?: string | null };
        Update: Partial<Charge>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Insert<Omit<Payment, "method" | "notes">> & {
          method?: string | null;
          notes?: string | null;
        };
        Update: Partial<Payment>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
