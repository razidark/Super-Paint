import React, { memo } from 'react';

interface PressureIndicatorProps {
  pressure: number;
}

const PressureIndicator: React.FC<PressureIndicatorProps> = memo(
  ({ pressure }) => (
    <div className={`pressure-indicator${pressure > 0 ? ' visible' : ''}`}>
      <span>Pressure</span>
      <div className="pressure-bar">
        <div
          className="pressure-fill"
          style={{ width: `${pressure * 100}%` }}
        />
      </div>
      <span>{Math.round(pressure * 100)}%</span>
    </div>
  )
);

PressureIndicator.displayName = 'PressureIndicator';
export default PressureIndicator;
