import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectPermitScanEntry } from '../ProjectPermitScanEntry';

describe('ProjectPermitScanEntry', () => {
  it('renders scan CTA and opens scan when clicked', () => {
    const onScan = vi.fn();
    const onOpenPermits = vi.fn();
    render(
      <ProjectPermitScanEntry onScan={onScan} onOpenPermits={onOpenPermits} openCount={5} />,
    );

    expect(screen.getByTestId('project-permit-scan-entry')).toBeInTheDocument();
    expect(screen.getByText(/Scan or upload a permit/i)).toBeInTheDocument();
    expect(screen.getByText(/5 permits still open/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('project-permit-scan-cta'));
    expect(onScan).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('project-permit-open-register'));
    expect(onOpenPermits).toHaveBeenCalledTimes(1);
  });
});
