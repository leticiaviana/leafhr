export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findOne(where: Partial<T>): Promise<T | null>;
  findMany(options?: {
    where?: Partial<T>;
    page?: number;
    pageSize?: number;
    orderBy?: { field: keyof T; direction: 'ASC' | 'DESC' };
  }): Promise<{ items: T[]; total: number }>;
}
