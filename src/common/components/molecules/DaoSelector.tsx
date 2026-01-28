import React from "react";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/common/components/atoms/select";

import { DAO_OPTIONS } from "@/constants/basedDaos";

interface Dao {
  name: string;
  contract: string;
  graphUrl: string;
  icon?: string;
}

export interface DaoSelectorProps {
  onChange: (selectedDao: Dao) => void;
  value: Dao | null;
  className?: string;
}

export const DaoSelector: React.FC<DaoSelectorProps> = ({
  onChange,
  value,
  className,
}) => {
  const settings = DAO_OPTIONS;

  return (
    <div className={className}>
      <Select
        value={value?.name}
        onValueChange={(selectedName) => {
          const selectedDao = settings.find((dao) => dao.name === selectedName);
          if (selectedDao) {
            onChange(selectedDao);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue>{value?.name || "Select a DAO"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {settings.map((dao: Dao) => (
            <SelectItem key={dao.name} value={dao.name}>
              <div className="flex items-center">
                {dao.icon && (
                  <img
                    src={dao.icon || "/brands/noggles.svg"}
                    alt={`${dao.name} icon`}
                    className="mr-2 h-auto w-5 rounded-sm"
                  />
                )}
                <span>{dao.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
