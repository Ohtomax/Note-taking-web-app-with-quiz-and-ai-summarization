import type { ListQuery } from '@/types/workspace';

export const initialQuery: ListQuery = {
  page: 1,
  pageSize: 12,
  search: '',
  archived: false,
  sort: 'updatedAt',
  order: 'desc',
};

export const projectColors = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  purple: 'bg-purple-100 text-purple-800',
  rose: 'bg-rose-100 text-rose-800',
  amber: 'bg-amber-100 text-amber-800',
};
export const projectIcons = {
  folder: 'Folder',
  book: 'Book',
  code: 'Code',
  science: 'Science',
  language: 'Language',
};
