// Mock ResizeObserver for recharts/jsdom
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';
import axios from 'axios';

jest.mock('axios');

const mockData = {
  total_tickets: 10,
  severity_distribution: { High: 2, Medium: 5, Low: 2, Critical: 1 },
  damage_type_distribution: { Pothole: 4, Crack: 3, Normal: 3 },
  status_distribution: { Open: 3, 'In Progress': 2, Resolved: 5 },
  trend: [],
  tickets: []
};

test('renders analytics dashboard', async () => {
  axios.get.mockResolvedValueOnce({ data: mockData });
  render(<AnalyticsDashboard />);
  await waitFor(() => expect(screen.getByText(/Total Reports/i)).toBeInTheDocument());
  expect(screen.getByText('10')).toBeInTheDocument();
});
