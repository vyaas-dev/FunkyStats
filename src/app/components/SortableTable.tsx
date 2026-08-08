"use client";
/* eslint-disable */

import { useState, useMemo } from "react";
import styles from "../page.module.css";

type SortableTableProps<T> = {
  data: T[];
  columns: Array<{
    key: string;
    label: string;
    sortable: boolean;
    getValue?: (item: T) => number;
    render?: (item: T) => React.ReactNode;
  }>;
  defaultSort: string;
  getItemKey: (item: T) => string;
  showSortIndex?: boolean;
  sortIndexHideFor?: string;
};

export default function SortableTable<T>({
  data,
  columns,
  defaultSort,
  getItemKey,
  showSortIndex = false,
  sortIndexHideFor = "rank",
}: SortableTableProps<T>) {
  const [sortField, setSortField] = useState(defaultSort);
  const [isAscending, setIsAscending] = useState(defaultSort === "rank");

  const sortedData = useMemo(() => {
    const sortColumn = columns.find((col) => col.key === sortField);
    if (!sortColumn?.sortable || !sortColumn.getValue) return data;

    return [...data].sort((a, b) => {
      const aValue = sortColumn.getValue!(a);
      const bValue = sortColumn.getValue!(b);
      return isAscending ? aValue - bValue : bValue - aValue;
    });
  }, [data, sortField, isAscending, columns]);

  const handleSort = (field: string) => {
    setIsAscending(sortField === field ? !isAscending : field === "rank");
    setSortField(field);
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return " ↕";
    return isAscending ? " ↑" : " ↓";
  };

  const SortableHeader = ({ column }: { column: (typeof columns)[0] }) => (
    <th
      className={`${styles.th} ${column.sortable ? styles.sortableHeader : ""}`}
      onClick={column.sortable ? () => handleSort(column.key) : undefined}
      style={column.sortable ? { cursor: "pointer" } : {}}
    >
      {column.label}
      {column.sortable && getSortIcon(column.key)}
    </th>
  );

  return (
    <div style={{ justifyContent: "center" }}>
      <table className={styles.table}>
        <thead>
          <tr>
            {showSortIndex && sortField !== sortIndexHideFor && (
              <th className={styles.th}>Sorted Rank</th>
            )}
            {columns.map((column) => (
              <SortableHeader key={column.key} column={column} />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, idx) => (
            <tr key={getItemKey(item)}>
              {showSortIndex && sortField !== sortIndexHideFor && (
                <td className={styles.td}>{idx + 1}</td>
              )}
              {columns.map((column) => (
                <td key={column.key} className={styles.td}>
                  {column.render
                    ? column.render(item)
                    : (item as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
