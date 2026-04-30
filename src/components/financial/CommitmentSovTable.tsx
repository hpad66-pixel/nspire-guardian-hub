/**
 * D2 · CommitmentSovTable — thin wrapper around the shared SovTable that wires
 * the commitment_sov_lines hooks. Separated so CommitmentDetailPage stays terse.
 */
import { useCommitmentSov, type CommitmentSovLine } from "@/hooks/useCommitments";
import { SovTable, type SovLine } from "./SovTable";
import { useCommitments } from "@/hooks/useCommitments";

export function CommitmentSovTable({
  commitmentId, originalValue, readOnly = false,
}: {
  commitmentId: string;
  originalValue: number;
  readOnly?: boolean;
}) {
  const { data: rows = [], addLine } = useCommitmentSov(commitmentId);

  const lines: SovLine[] = rows.map((l: CommitmentSovLine) => ({
    id: l.id,
    line_no: l.line_no,
    cost_code_id: l.cost_code_id,
    description: l.description,
    scheduled_value: Number(l.scheduled_value ?? 0),
  }));

  return (
    <SovTable
      lines={lines}
      targetTotal={originalValue}
      readOnly={readOnly}
      onChange={() => {}}
      onPersist={async (line) => {
        // For draft rows (id prefixed 'draft-'), insert new SOV line.
        if (line.id.startsWith("draft-") && line.cost_code_id) {
          await addLine.mutateAsync({
            line_no: line.line_no,
            cost_code_id: line.cost_code_id,
            description: line.description,
            scheduled_value: line.scheduled_value,
          });
        }
      }}
    />
  );
}
