import { useCostTypes } from "@/hooks/useCostCodes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CostTypePicker({
  value,
  onChange,
  placeholder = "Select cost type",
  disabled,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { data: types = [] } = useCostTypes();
  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) => onChange(v || null)}
      disabled={disabled || types.length === 0}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {types.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            <span className="font-mono text-muted-foreground mr-2">{t.code}</span>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
