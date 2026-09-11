"use client";

import { Construction } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type Props = { titleKey: string };

export const UnderConstruction: React.FC<Props> = ({ titleKey }) => {
  const { t } = useLanguage();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
          <Construction size={28} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          {t(titleKey)}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          {t("under_construction_description")}
        </p>
      </div>
    </div>
  );
};
