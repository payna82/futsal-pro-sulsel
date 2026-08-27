import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryKey } from "@/domain/types";

export function CategoryTabs({
  value,
  onChange,
}: {
  value: CategoryKey;
  onChange: (value: CategoryKey) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as CategoryKey)}>
      <TabsList>
        <TabsTrigger value="MEN">Putra</TabsTrigger>
        <TabsTrigger value="WOMEN">Putri</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
