import React from "react";

/**
 * TableHeaderFilters Component
 *
 * A reusable component that provides header-level filtering for tables.
 * Supports text inputs, dropdowns, and date pickers with consistent styling.
 */

// Filter input component for text-based columns
export const TextFilter = ({
  value,
  onChange,
  placeholder = "Filter...",
  style = {},
  ...props
}) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "calc(100% - 4px)",
        maxWidth: "100%",
        padding: "4px 8px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        background: "#f9fafb",
        fontFamily:
          "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxSizing: "border-box",
        ...style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "#3b82f6";
        e.target.style.boxShadow = "0 0 0 1px rgba(59, 130, 246, 0.1)";
        e.target.style.background = "#ffffff";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "#d1d5db";
        e.target.style.boxShadow = "none";
        e.target.style.background = "#f9fafb";
      }}
      {...props}
    />
  );
};

// Filter dropdown component for categorical data
export const DropdownFilter = ({
  value,
  onChange,
  options = [],
  placeholder = "All",
  style = {},
  ...props
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "calc(100% - 4px)",
        maxWidth: "100%",
        padding: "4px 8px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        background: "#f9fafb",
        fontFamily:
          "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        outline: "none",
        cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxSizing: "border-box",
        ...style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "#3b82f6";
        e.target.style.boxShadow = "0 0 0 1px rgba(59, 130, 246, 0.1)";
        e.target.style.background = "#ffffff";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "#d1d5db";
        e.target.style.boxShadow = "none";
        e.target.style.background = "#f9fafb";
      }}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((option, index) => (
        <option key={index} value={option.value || option}>
          {option.label || option}
        </option>
      ))}
    </select>
  );
};

// Filter date picker component for date fields
export const DateFilter = ({
  value,
  onChange,
  placeholder = "Filter by date...",
  style = {},
  ...props
}) => {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "calc(100% - 4px)",
        maxWidth: "100%",
        padding: "4px 8px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        background: "#f9fafb",
        fontFamily:
          "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        outline: "none",
        cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxSizing: "border-box",
        ...style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "#3b82f6";
        e.target.style.boxShadow = "0 0 0 1px rgba(59, 130, 246, 0.1)";
        e.target.style.background = "#ffffff";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "#d1d5db";
        e.target.style.boxShadow = "none";
        e.target.style.background = "#f9fafb";
      }}
      {...props}
    />
  );
};

// Clear filter button component
export const ClearFilterButton = ({
  onClick,
  disabled = false,
  style = {},
  ...props
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "2px 6px",
        fontSize: "10px",
        border: "1px solid #d1d5db",
        borderRadius: "3px",
        background: disabled ? "#f3f4f6" : "#ffffff",
        color: disabled ? "#9ca3af" : "#374151",
        fontFamily:
          "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        marginLeft: "4px",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.background = "#f3f4f6";
          e.target.style.borderColor = "#9ca3af";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.target.style.background = "#ffffff";
          e.target.style.borderColor = "#d1d5db";
        }
      }}
      title="Clear filter"
      {...props}
    >
      ✕
    </button>
  );
};

// Combined filter container for header cells
export const FilterContainer = ({
  children,
  style = {},
  showClearAll = false,
  onClearAll = () => {},
  ...props
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "4px 0",
        ...style,
      }}
      {...props}
    >
      {children}
      {showClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          style={{
            padding: "2px 6px",
            fontSize: "10px",
            border: "1px solid #dc2626",
            borderRadius: "3px",
            background: "#ffffff",
            color: "#dc2626",
            fontFamily:
              "Maax, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            cursor: "pointer",
            transition: "all 0.2s",
            alignSelf: "center",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#dc2626";
            e.target.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#ffffff";
            e.target.style.color = "#dc2626";
          }}
          title="Clear all filters"
        >
          Clear All
        </button>
      )}
    </div>
  );
};

// Hook for managing table filters
export const useTableFilters = (initialFilters = {}) => {
  const [filters, setFilters] = React.useState(initialFilters);

  const updateFilter = React.useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearFilter = React.useCallback((key) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const clearAllFilters = React.useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = React.useMemo(() => {
    return Object.values(filters).some(
      (value) => value !== undefined && value !== null && value !== ""
    );
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
  };
};

// Utility function to apply filters to data
export const applyFilters = (data, filters) => {
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }

  return data.filter((item) => {
    return Object.entries(filters).every(([key, filterValue]) => {
      if (!filterValue) return true;

      const itemValue = item[key];
      if (itemValue === undefined || itemValue === null) return false;

      // For string comparisons (case-insensitive)
      if (typeof filterValue === "string") {
        return String(itemValue)
          .toLowerCase()
          .includes(filterValue.toLowerCase());
      }

      // For exact matches (numbers, dates, etc.)
      return itemValue === filterValue;
    });
  });
};

export default {
  TextFilter,
  DropdownFilter,
  DateFilter,
  ClearFilterButton,
  FilterContainer,
  useTableFilters,
  applyFilters,
};
