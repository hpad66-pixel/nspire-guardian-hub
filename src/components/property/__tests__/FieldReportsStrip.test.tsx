import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FieldReportsStrip } from '../FieldReportsStrip';

describe('FieldReportsStrip', () => {
  it('links inspections and daily reports together', () => {
    render(
      <MemoryRouter>
        <FieldReportsStrip highlight="nspire" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('field-reports-strip')).toBeTruthy();
    expect(screen.getByText('NSPIRE')).toBeTruthy();
    expect(screen.getByText('Daily Reports')).toBeTruthy();
    expect(screen.getByText('Daily Grounds')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Daily Reports/i }).getAttribute('href')).toBe('/daily-reports');
  });
});
