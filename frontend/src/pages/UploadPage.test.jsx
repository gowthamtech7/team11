import { render, screen } from '@testing-library/react';
import UploadPage from './UploadPage.jsx';

test('renders upload page', () => {
  render(<UploadPage />);
  expect(screen.getByText(/Report Road Damage/i)).toBeInTheDocument();
});
