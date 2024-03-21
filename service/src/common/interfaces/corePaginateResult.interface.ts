export interface CorePaginateResult {
  status?: boolean;
  statusCode: number;
  data?: {
    list?: any;
    total?: number;
    pages?: number;
    hasNextPage?: boolean;
    encKey?: string;
  } | null;
  message: string;
}
