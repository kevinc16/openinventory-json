export type ChartPoint = {
  readonly unpricedCount?: number;
  readonly takenAt: number;
  readonly value: number;
  readonly restorable?: boolean;
};

export type ValueChartProps = {
  readonly onSelect?: (takenAt: number) => void;
  readonly points: readonly ChartPoint[];
  readonly currency: string;
  /** Colours the line: green when the range ended higher than it began, red otherwise. */
  readonly tone: "up" | "down";
};
