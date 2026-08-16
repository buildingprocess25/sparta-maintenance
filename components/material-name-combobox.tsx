"use client";

import { useMemo } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { searchMaterialNames } from "@/lib/material-master";

interface MaterialNameComboboxProps {
  id: string;
  value: string;
  options: readonly string[];
  onValueChange: (value: string) => void;
  "data-tour"?: string;
}

export function MaterialNameCombobox({
  id,
  value,
  options,
  onValueChange,
  "data-tour": dataTour,
}: MaterialNameComboboxProps) {
  const suggestions = useMemo(
    () => searchMaterialNames(options, value),
    [options, value],
  );
  const selectedValue = options.includes(value) ? value : null;

  return (
    <Combobox
      items={options}
      filteredItems={suggestions}
      filter={null}
      value={selectedValue}
      inputValue={value}
      onInputValueChange={onValueChange}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange(nextValue);
      }}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        data-tour={dataTour}
        placeholder="Ketik nama material"
        className="h-11 w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>
          Nama belum ada di master. Teks tetap dapat digunakan.
        </ComboboxEmpty>
        <ComboboxList>
          {(option) => (
            <ComboboxItem key={option} value={option}>
              {option}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
