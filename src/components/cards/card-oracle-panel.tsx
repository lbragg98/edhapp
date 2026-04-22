import { DetailPanel } from "@/components/cards/detail-panel";

type CardOraclePanelProps = {
  oracleText: string | null;
};

export function CardOraclePanel({ oracleText }: CardOraclePanelProps) {
  return (
    <DetailPanel title="Oracle Text" subtitle="Normalized rules text">
      <p className="whitespace-pre-line text-sm leading-7 text-zinc-200">
        {oracleText ?? "No oracle text available."}
      </p>
    </DetailPanel>
  );
}
