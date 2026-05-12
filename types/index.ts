// Global app types

export interface DashboardStats {
  totalProfiles: number;
  totalCards: number;
  totalTransactions: number;
  totalPaid: number;
  totalCharges: number;
  totalPending: number;
  monthlyCharges: number;
  pendingByGateway: Array<{ gateway: string; amount: number }>;
}

export interface ServerActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
