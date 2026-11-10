import { Button } from "./Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  noun: string;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, totalCount, noun, onPageChange }: PaginationProps) {
  const pages = Math.max(totalPages, 1);
  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="muted numeric">
        {totalCount} {noun}
        {totalCount === 1 ? "" : "s"} · Page {page} of {pages}
      </p>
      <div className="pagination-buttons">
        <Button size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
