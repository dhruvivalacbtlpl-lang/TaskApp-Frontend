import { useState } from "react";

export default function StaffList({ staffs, onDelete }) {
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = staffs.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / entries);
  const start = (page - 1) * entries;
  const currentData = filtered.slice(start, start + entries);

  return (
    <div className="bg-white border">
      {/* Table controls */}
      <div className="flex justify-between items-center px-4 py-2 text-sm">
        <div>
          Show{" "}
          <select
            value={entries}
            onChange={(e) => {
              setEntries(Number(e.target.value));
              setPage(1);
            }}
            className="border mx-1 px-2 py-1"
          >
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>{" "}
          entries
        </div>

        <div>
          Search:{" "}
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border px-2 py-1"
          />
        </div>
      </div>

      {/* Table */}
      <table className="min-w-full text-sm border-t">
        <thead>
          <tr className="bg-red-600 text-white">
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Email</th>
            <th className="px-3 py-2 text-left">Phone</th>
            <th className="px-3 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {currentData.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center py-4">
                No data available
              </td>
            </tr>
          ) : (
            currentData.map((staff, index) => (
              <tr key={staff._id} className="border-b">
                <td className="px-3 py-2">
                  {start + index + 1}
                </td>
                <td className="px-3 py-2">{staff.name}</td>
                <td className="px-3 py-2">{staff.email}</td>
                <td className="px-3 py-2">{staff.mobile}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => onDelete(staff._id)}
                    className="bg-red-500 text-white px-2 py-1 text-xs rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-between items-center px-4 py-2 text-sm">
        <div>
          Showing {start + 1} to{" "}
          {Math.min(start + entries, filtered.length)} of{" "}
          {filtered.length} entries
        </div>

        <div className="flex gap-1">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="border px-3 py-1 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="border px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
