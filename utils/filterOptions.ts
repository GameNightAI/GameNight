export interface FilterOption {
  value: any;
  label: string;
  min?: number;
  max?: number;
}

// Player count options: 1-14 players + 15+
export const playerOptions: FilterOption[] = Array.from({ length: 14 }, (_, i) => String(i + 1))
  .concat(['15+'])
  .map(value => ({
    value: value === '15+' ? 15 : parseInt(value),
    label: value
  }));

// Play time options with min/max ranges
export const timeOptions: FilterOption[] = [
  { value: 1, min: 1, max: 30, label: '30 min or less' },
  { value: 31, min: 31, max: 60, label: '31-60 min' },
  { value: 61, min: 61, max: 90, label: '61-90 min' },
  { value: 91, min: 91, max: 120, label: '91-120 min' },
  { value: 121, min: 121, max: 999999999, label: 'More than 120 min' },
];

// Age range options with min/max ranges
export const ageOptions: FilterOption[] = [
  { value: 1, min: 1, max: 5, label: '5 and under' },
  { value: 6, min: 6, max: 7, label: '6-7' },
  { value: 8, min: 8, max: 9, label: '8-9' },
  { value: 10, min: 10, max: 11, label: '10-11' },
  { value: 12, min: 12, max: 13, label: '12-13' },
  { value: 14, min: 14, max: 15, label: '14-15' },
  { value: 16, min: 16, max: 999, label: '16 and up' },
];

// Game type options
export const typeOptions: FilterOption[] = ['Competitive', 'Cooperative', 'Team-based']
  .map(value => ({ value, label: value }));

// Complexity options with numeric values
export const complexityOptions: FilterOption[] = ['Light', 'Medium Light', 'Medium', 'Medium Heavy', 'Heavy']
  .map((label, index) => ({ value: index + 1, label }));
