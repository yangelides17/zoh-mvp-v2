/**
 * FilterDropdown Component
 *
 * Multi-select dropdown with checkboxes for filtering
 */

import React, { useState, useRef, useEffect } from 'react';
import './FilterDropdown.css';

const FilterDropdown = ({
  label,
  options = [],
  selected = [],
  onChange,
  icon = '▼'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Filter options by search term
  const filteredOptions = options.filter(option =>
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if all filtered options are selected
  const allSelected = filteredOptions.length > 0 &&
    filteredOptions.every(opt => selected.includes(opt.value));

  // Toggle individual option
  const handleToggle = (value) => {
    const newSelected = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  // Select all filtered options
  const handleSelectAll = () => {
    const allValues = new Set([...selected, ...filteredOptions.map(opt => opt.value)]);
    onChange(Array.from(allValues));
  };

  // Clear all selections
  const handleClearAll = () => {
    onChange([]);
  };

  // Get display text for button
  const getDisplayText = () => {
    if (selected.length === 0) {
      return `${label}: All`;
    }
    if (selected.length === 1) {
      const option = options.find(opt => opt.value === selected[0]);
      return `${label}: ${option?.label || selected[0]}`;
    }
    if (selected.length <= 2) {
      return `${label}: ${selected.slice(0, 2).join(', ')}`;
    }
    return `${label}: ${selected[0]} +${selected.length - 1} more`;
  };

  return (
    <div className="filter-dropdown" ref={dropdownRef}>
      <button
        className={`filter-dropdown-button ${isOpen ? 'open' : ''} ${selected.length > 0 ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="filter-label">{getDisplayText()}</span>
        <span className="filter-icon">{icon}</span>
      </button>

      {isOpen && (
        <div className="filter-dropdown-menu">
          {/* Search Box */}
          {options.length > 5 && (
            <div className="filter-search">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-search-input"
                autoFocus
              />
            </div>
          )}

          {/* Select All / Clear All */}
          <div className="filter-actions">
            <button
              className="filter-action-button"
              onClick={handleSelectAll}
              disabled={allSelected}
            >
              Select All
            </button>
            <button
              className="filter-action-button"
              onClick={handleClearAll}
              disabled={selected.length === 0}
            >
              Clear All
            </button>
          </div>

          <div className="filter-divider"></div>

          {/* Options List */}
          <div className="filter-options-list">
            {filteredOptions.length === 0 ? (
              <div className="filter-no-results">No results found</div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option.value}
                  className="filter-option"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => handleToggle(option.value)}
                    className="filter-checkbox"
                  />
                  <span className="filter-option-label">{option.label}</span>
                  {option.count !== undefined && (
                    <span className="filter-option-count">({option.count})</span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
