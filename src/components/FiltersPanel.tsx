import React, { memo } from 'react';
import { Sliders, ChevronDown } from 'lucide-react';
import type { ImageFilters } from '../types';
import { FILTER_DEFS } from '../constants';

interface FiltersPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: ImageFilters;
  onFiltersChange: (f: ImageFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

const FiltersPanel: React.FC<FiltersPanelProps> = memo(
  ({ isOpen, onToggle, filters, onFiltersChange, onApply, onReset }) => (
    <div className="panel-section">
      <div
        className={`panel-header${isOpen ? '' : ' collapsed'}`}
        onClick={onToggle}
      >
        <span>
          <Sliders size={11} style={{ display: 'inline', marginRight: 5 }} />
          Adjustments
        </span>
        <ChevronDown size={12} />
      </div>
      {isOpen && (
        <div className="panel-body">
          {FILTER_DEFS.map(({ key, label, min, max }) => (
            <div className="slider-row" key={key}>
              <div className="slider-label">
                <span>{label}</span>
                <span className="slider-value">{filters[key]}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={filters[key]}
                onChange={(e) =>
                  onFiltersChange({ ...filters, [key]: +e.target.value })
                }
              />
            </div>
          ))}

          <button className="panel-action-btn accent" onClick={onApply}>
            Apply to Active Layer
          </button>
          <button className="panel-action-btn" onClick={onReset}>
            Reset Filters
          </button>
        </div>
      )}
    </div>
  )
);

FiltersPanel.displayName = 'FiltersPanel';
export default FiltersPanel;
