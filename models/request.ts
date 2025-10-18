export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Request {
  id: string;
  userId: string;
  itemName: string;
  quantity: number;
  description?: string;
  imageUrl?: string;
  department?: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}
