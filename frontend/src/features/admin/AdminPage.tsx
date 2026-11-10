import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getStats, listUsers } from "@/api/admin";
import { queryKeys } from "@/api/queryKeys";
import { TASK_STATUSES } from "@/api/types";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/Pagination";
import { Skeleton } from "@/components/Skeleton";
import { STATUS_LABELS } from "@/components/taskLabels";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatTimestamp } from "@/lib/dates";

const USERS_PAGE_SIZE = 10;

export function AdminPage() {
  useDocumentTitle("Admin");
  const [page, setPage] = useState(1);
  const stats = useQuery({ queryKey: queryKeys.admin.stats(), queryFn: getStats });
  const users = useQuery({
    queryKey: queryKeys.admin.users(page, USERS_PAGE_SIZE),
    queryFn: () => listUsers(page, USERS_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Admin</h1>
          <p className="muted">Usage across every account.</p>
        </div>
      </div>

      <section aria-labelledby="stats-heading" className="section">
        <h2 id="stats-heading" className="section-title">
          Overview
        </h2>
        {stats.isPending && (
          <div className="stats-grid" aria-busy="true" aria-label="Loading statistics">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="skeleton-stat" />
            ))}
          </div>
        )}
        {stats.isError && (
          <ErrorState error={stats.error} title="Could not load statistics" onRetry={() => void stats.refetch()} />
        )}
        {stats.data && (
          <dl className="stats-grid">
            <StatCard label="Users" value={stats.data.userCount} />
            <StatCard label="Projects" value={stats.data.projectCount} />
            <StatCard label="Tasks" value={stats.data.taskCount} />
            {TASK_STATUSES.map((status) => (
              <StatCard key={status} label={STATUS_LABELS[status]} value={stats.data.tasksByStatus[status] ?? 0} />
            ))}
          </dl>
        )}
      </section>

      <section aria-labelledby="users-heading" className="section">
        <h2 id="users-heading" className="section-title">
          Users
        </h2>
        {users.isPending && (
          <div className="stack" aria-busy="true" aria-label="Loading users">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="skeleton-row" />
            ))}
          </div>
        )}
        {users.isError && (
          <ErrorState error={users.error} title="Could not load users" onRetry={() => void users.refetch()} />
        )}
        {users.data && (
          <>
            <div className="table-wrap">
              <table className="task-table">
                <caption className="visually-hidden">All registered users</caption>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Projects</th>
                    <th scope="col">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.items.map((user) => (
                    <tr key={user.id}>
                      <td>{user.displayName}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className="chip chip-role">{user.role}</span>
                      </td>
                      <td className="numeric">{user.projectCount}</td>
                      <td className="numeric">{formatTimestamp(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={users.data.page}
              totalPages={users.data.totalPages}
              totalCount={users.data.totalCount}
              noun="user"
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card stat-card">
      <dt className="stat-label">{label}</dt>
      <dd className="stat-value numeric">{value}</dd>
    </div>
  );
}
